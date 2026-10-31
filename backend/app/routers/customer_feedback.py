import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import SupportTicket, CustomerReview, Customer
from app.models.schemas import SupportTicketCreate, CustomerReviewCreate

router = APIRouter(prefix="/customers", tags=["Customer Feedback Portal"])

@router.post("/complaints")
def submit_complaint(complaint: SupportTicketCreate, db: Session = Depends(get_db)):
    ticket_id = f"tkt_{uuid.uuid4().hex[:8]}"
    ticket = SupportTicket(
        id=ticket_id,
        company_id=complaint.company_id,
        customer_id=complaint.customer_id or "cust_anonymous",
        order_id=complaint.order_id,
        category=complaint.category,
        priority=complaint.priority or "medium",
        status="open",
        title=complaint.title,
        description=complaint.description,
        created_at=datetime.utcnow()
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

@router.get("/complaints")
def list_complaints(company_id: str, db: Session = Depends(get_db)):
    return db.query(SupportTicket).filter(
        SupportTicket.company_id == company_id
    ).order_by(SupportTicket.created_at.desc()).all()

@router.post("/reviews")
def submit_review(review: CustomerReviewCreate, db: Session = Depends(get_db)):
    review_id = f"rev_{uuid.uuid4().hex[:8]}"
    rev = CustomerReview(
        id=review_id,
        company_id=review.company_id,
        customer_id=review.customer_id,
        product_id=review.product_id,
        rating=review.rating,
        review_text=review.review_text,
        created_at=datetime.utcnow()
    )
    db.add(rev)
    db.commit()
    db.refresh(rev)
    return rev

@router.get("/reviews")
def list_reviews(company_id: str, db: Session = Depends(get_db)):
    return db.query(CustomerReview).filter(
        CustomerReview.company_id == company_id
    ).order_by(CustomerReview.created_at.desc()).all()

