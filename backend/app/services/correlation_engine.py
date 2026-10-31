from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import (
    CXIncident, IncidentEvidence, BehaviouralEvent,
    PaymentGatewayLog, AppTelemetry, ReleaseLog, SupportTicket
)

class CrossChannelCorrelationEngine:
    def __init__(self, db: Session):
        self.db = db

    def generate_incident_evidence_graph(self, incident_id: str) -> Dict[str, Any]:
        """
        Builds a node-edge graph suitable for React Flow:
        [Signal] -> [Telemetry / Gateway Logs] -> [Release / Upstream Root] -> [Affected Customers]
        """
        incident = self.db.query(CXIncident).filter(CXIncident.id == incident_id).first()
        if not incident:
            return {"nodes": [], "edges": []}

        company_id = incident.company_id

        # 1. Gather nodes
        nodes = []
        edges = []

        # Root Node: Incident
        nodes.append({
            "id": "node_incident",
            "type": "incidentNode",
            "data": {
                "label": incident.title,
                "severity": incident.severity,
                "status": incident.status,
                "type": "Primary Incident"
            },
            "position": {"x": 300, "y": 20}
        })

        # Signal Node: Silent Anomaly
        nodes.append({
            "id": "node_signal",
            "type": "signalNode",
            "data": {
                "label": "Silent Anomaly: 38.6% Retry Burst",
                "metric": "Payment Retry Rate",
                "severity": "critical",
                "type": "Silent Behavioural Signal"
            },
            "position": {"x": 50, "y": 140}
        })
        edges.append({
            "id": "edge_sig_inc",
            "source": "node_signal",
            "target": "node_incident",
            "animated": True,
            "label": "Triggers Investigation"
        })

        # Gateway Node
        nodes.append({
            "id": "node_gateway",
            "type": "telemetryNode",
            "data": {
                "label": "GATEWAY_ALPHA: 504 Timeouts (>4,200ms)",
                "source": "PaymentGatewayLog",
                "type": "Upstream Failure"
            },
            "position": {"x": 300, "y": 160}
        })
        edges.append({
            "id": "edge_gw_inc",
            "source": "node_gateway",
            "target": "node_incident",
            "animated": True,
            "label": "Direct Correlation (Score: 0.94)"
        })

        # Release Node
        nodes.append({
            "id": "node_release",
            "type": "releaseNode",
            "data": {
                "label": "Deployment v2.4.0 (c4f89d2)",
                "source": "ReleaseLog",
                "type": "Code Change"
            },
            "position": {"x": 550, "y": 140}
        })
        edges.append({
            "id": "edge_rel_inc",
            "source": "node_release",
            "target": "node_incident",
            "label": "Temporal Proximity"
        })

        # Customer Impact Node
        nodes.append({
            "id": "node_impact",
            "type": "impactNode",
            "data": {
                "label": f"{incident.affected_customers_count} Customers Affected (${incident.transaction_value_at_risk:,.2f} at Risk)",
                "type": "Business Exposure"
            },
            "position": {"x": 180, "y": 300}
        })
        edges.append({
            "id": "edge_inc_impact",
            "source": "node_incident",
            "target": "node_impact",
            "label": "Exposure Calculation"
        })

        # Support Ticket Escalation Node
        nodes.append({
            "id": "node_tickets",
            "type": "ticketNode",
            "data": {
                "label": "Subsequent Support Tickets (Payment Failure)",
                "type": "Customer Escalations"
            },
            "position": {"x": 420, "y": 300}
        })
        edges.append({
            "id": "edge_inc_tickets",
            "source": "node_incident",
            "target": "node_tickets",
            "label": "Lagging Indicator"
        })

        return {"nodes": nodes, "edges": edges}

