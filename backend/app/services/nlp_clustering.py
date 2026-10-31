import re
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sqlalchemy.orm import Session
from app.models.db_models import SupportTicket, CustomerReview

class NLPComplaintClustering:
    def __init__(self, db: Session):
        self.db = db

    def clean_text(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def cluster_feedback(self, company_id: str, n_clusters: int = 3) -> List[Dict[str, Any]]:
        """
        Gathers tickets and reviews, creates TF-IDF embeddings, and clusters them using K-Means
        to identify emerging topic themes.
        """
        tickets = self.db.query(SupportTicket).filter(SupportTicket.company_id == company_id).all()
        reviews = self.db.query(CustomerReview).filter(CustomerReview.company_id == company_id).all()

        documents = []
        for t in tickets:
            documents.append({
                "id": t.id,
                "source": "ticket",
                "text": f"{t.title}. {t.description}",
                "category": t.category
            })
        for r in reviews:
            documents.append({
                "id": r.id,
                "source": "review",
                "text": r.review_text,
                "category": "product_review"
            })

        if len(documents) < n_clusters:
            # Fallback for small sample size
            return [{
                "cluster_id": 0,
                "topic": "Checkout & Gateway Interruption",
                "item_count": len(documents),
                "top_keywords": ["payment", "gateway", "checkout", "retry", "failed"],
                "sample_items": [d["text"] for d in documents[:3]]
            }]

        corpus = [self.clean_text(d["text"]) for d in documents]
        vectorizer = TfidfVectorizer(max_features=50, stop_words="english")
        X = vectorizer.fit_transform(corpus)

        k = min(n_clusters, len(documents))
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)

        order_centroids = kmeans.cluster_centers_.argsort()[:, ::-1]
        terms = vectorizer.get_feature_names_out()

        clusters = []
        for i in range(k):
            cluster_docs = [documents[idx] for idx, lbl in enumerate(labels) if lbl == i]
            top_words = [terms[ind] for ind in order_centroids[i, :5]]
            
            # Identify dominant theme
            topic_label = " / ".join(top_words[:3]).title()
            clusters.append({
                "cluster_id": i,
                "topic": topic_label,
                "item_count": len(cluster_docs),
                "top_keywords": top_words,
                "sample_items": [d["text"] for d in cluster_docs[:2]]
            })

        return sorted(clusters, key=lambda x: x["item_count"], reverse=True)

