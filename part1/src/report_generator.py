import os
import json
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ForensicReportGenerator:
    def __init__(self):
        pass

    def generate_html_report(self, report_data, output_path):
        pcap_meta = report_data.get("pcap", {})
        risk_meta = report_data.get("risk_assessment", {})
        enterprise = report_data.get("enterprise_posture", {})
        findings = report_data.get("findings", [])
        sessions = report_data.get("email_sessions", [])
        sec_assessment = report_data.get("security_assessment", {})
        controls = sec_assessment.get("controls", [])
        violations = sec_assessment.get("violations", [])

        risk_score = risk_meta.get("overall_risk_score", 0)
        risk_level = risk_meta.get("risk_level", "MINIMAL")
        baseline_score = sec_assessment.get("baseline_score", 0)
        crypto_score = sec_assessment.get("cryptographic_score", 0)
        score_delta = sec_assessment.get("score_delta", 0)

        risk_color_map = {
            "CRITICAL": "#ef4444",
            "HIGH": "#f97316",
            "MODERATE": "#eab308",
            "LOW": "#3b82f6",
            "MINIMAL": "#10b981"
        }
        badge_color = risk_color_map.get(risk_level, "#6b7280")

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Email Cryptographic Security Posture Forensic Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
        .container {{ max-width: 1100px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
        h1 {{ color: #38bdf8; border-bottom: 2px solid #334155; padding-bottom: 10px; font-size: 24px; }}
        h2 {{ color: #94a3b8; font-size: 18px; margin-top: 30px; border-bottom: 1px solid #334155; padding-bottom: 6px; }}
        .badge {{ display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; color: white; background-color: {badge_color}; }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }}
        .card {{ background-color: #0f172a; padding: 18px; border-radius: 8px; border: 1px solid #334155; }}
        .card-title {{ color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }}
        .card-value {{ font-size: 22px; font-weight: bold; margin-top: 5px; color: #f1f5f9; }}
        .v-card {{ background-color: #0f172a; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px; margin-bottom: 12px; border-top:1px solid #334155; border-right:1px solid #334155; border-bottom:1px solid #334155; }}
        .v-title {{ font-weight: bold; color: #f8fafc; font-size: 15px; margin-bottom: 6px; }}
        .v-meta {{ font-size: 12px; color: #94a3b8; margin-bottom: 6px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; background-color: #0f172a; border-radius: 8px; overflow: hidden; }}
        th, td {{ padding: 12px 15px; text-align: left; border-bottom: 1px solid #334155; font-size: 13px; }}
        th {{ background-color: #1e293b; color: #38bdf8; font-weight: 600; }}
        tr:hover {{ background-color: #1e293b; }}
        .status-VIOLATION {{ color: #ef4444; font-weight: bold; }}
        .status-WARNING {{ color: #fbbf24; font-weight: bold; }}
        .status-PASS {{ color: #34d399; font-weight: bold; }}
        .status-NOT-OBSERVED {{ color: #94a3b8; }}
        .footer {{ margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>AI-Assisted Passive Email Cryptographic Security Posture Report</h1>
        <p style="color: #94a3b8;">Analyzed Files: <code>{', '.join(pcap_meta.get('files_analyzed', []))}</code> | Generated: {pcap_meta.get('analyzed_at')}</p>

        <div class="grid">
            <div class="card">
                <div class="card-title">Final Risk Score</div>
                <div class="card-value">{risk_score} / 100</div>
            </div>
            <div class="card">
                <div class="card-title">Posture Risk Level</div>
                <div class="card-value"><span class="badge">{risk_level}</span></div>
            </div>
            <div class="card">
                <div class="card-title">Baseline Score</div>
                <div class="card-value">{baseline_score}</div>
            </div>
            <div class="card">
                <div class="card-title">Crypto Score Δ</div>
                <div class="card-value">+{score_delta}</div>
            </div>
            <div class="card">
                <div class="card-title">Total Email Sessions</div>
                <div class="card-value">{pcap_meta.get('total_connections', 0)}</div>
            </div>
        </div>

        <h2>Security Control Evaluation Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Control Name</th>
                    <th>Category</th>
                    <th>Observed Value</th>
                    <th>Expected Value</th>
                    <th>Status</th>
                    <th>Score Contribution</th>
                </tr>
            </thead>
            <tbody>
                {"".join(f"<tr><td><b>{c.get('name')}</b></td><td>{c.get('category')}</td><td>{c.get('observed')}</td><td>{c.get('expected')}</td><td class='status-{c.get('status').replace(' ', '-')}'>{c.get('status_symbol')}</td><td>+{c.get('score_contribution')} pts</td></tr>" for c in controls)}
            </tbody>
        </table>

        <h2>Security Control Violations & Recommended Remediation</h2>
        {"".join(f'''
        <div class="v-card">
            <div class="v-title">{v.get('status_symbol')} {v.get('name')} (Severity: {v.get('severity')})</div>
            <div class="v-meta"><b>Observed:</b> {v.get('observed')} | <b>Expected:</b> {v.get('expected')} | <b>Risk Contribution:</b> +{v.get('score_contribution')} pts</div>
            <div style="font-size:13px; color:#cbd5e1; margin-bottom:6px;"><b>Why:</b> {v.get('why')}</div>
            <div style="font-size:12px; color:#94a3b8; font-family:monospace; margin-bottom:6px;"><b>Evidence:</b> {v.get('evidence')}</div>
            <div style="font-size:13px; color:#34d399;"><b>Recommended Action:</b> {v.get('recommendation')}</div>
        </div>
        ''' for v in violations) if violations else "<p style='color:#34d399;'>No security control violations detected.</p>"}

        <h2>Analyzed Email Sessions Inventory</h2>
        <table>
            <thead>
                <tr>
                    <th>UID</th>
                    <th>Protocol</th>
                    <th>Encryption Mode</th>
                    <th>TLS Version</th>
                    <th>Cipher Suite</th>
                    <th>ML Anomaly Score</th>
                </tr>
            </thead>
            <tbody>
                {"".join(f"<tr><td>{s.get('uid')}</td><td>{s.get('protocol')}</td><td>{s.get('encryption_mode')}</td><td>{s.get('tls_version') or 'None'}</td><td>{s.get('cipher_suite') or 'None'}</td><td>{s.get('ml_anomaly_score', 0.0)}</td></tr>" for s in sessions)}
            </tbody>
        </table>

        <div class="footer">
            <p>Generated by Passive Email Cryptographic Security Framework v1.0.0 | Offline Deterministic & ML Analysis Engine</p>
        </div>
    </div>
</body>
</html>
"""

        os.makedirs(Path(output_path).parent, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"[Report Generator] HTML Report generated: {output_path}")

    def generate_pdf_report(self, report_data, output_path):
        pcap_meta = report_data.get("pcap", {})
        risk_meta = report_data.get("risk_assessment", {})
        sec_assessment = report_data.get("security_assessment", {})
        controls = sec_assessment.get("controls", [])
        findings = report_data.get("findings", [])

        doc = SimpleDocTemplate(str(output_path), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#1e293b'), spaceAfter=6)
        subtitle_style = ParagraphStyle('SubTitleStyle', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#64748b'), spaceAfter=10)
        heading_style = ParagraphStyle('HeadingStyle', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#0f172a'), spaceBefore=10, spaceAfter=4)

        story.append(Paragraph("Email Cryptographic Security Posture Forensic Report", title_style))
        story.append(Paragraph(f"PCAPs: {len(pcap_meta.get('files_analyzed', []))} | Generated: {pcap_meta.get('analyzed_at')}", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=10))

        # Executive Summary Table
        summary_data = [
            ["Final Risk Score", "Risk Level", "Baseline Score", "Crypto Delta", "Total Sessions"],
            [str(risk_meta.get("overall_risk_score", 0)), str(risk_meta.get("risk_level", "MINIMAL")), str(sec_assessment.get("baseline_score", 0)), f"+{sec_assessment.get('score_delta', 0)}", str(pcap_meta.get("total_connections", 0))]
        ]
        t_summary = Table(summary_data, colWidths=[100, 100, 100, 100, 120])
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#334155')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1'))
        ]))
        story.append(t_summary)
        story.append(Spacer(1, 10))

        # Security Controls Summary Table
        story.append(Paragraph("Security Control Assessment Summary", heading_style))
        ctrl_data = [["Control Name", "Category", "Status", "Contribution"]]
        for c in controls[:10]:
            ctrl_data.append([
                str(c.get("name")),
                str(c.get("category")),
                str(c.get("status_symbol")),
                f"+{c.get('score_contribution')} pts"
            ])

        t_ctrls = Table(ctrl_data, colWidths=[160, 140, 120, 100])
        t_ctrls.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0'))
        ]))
        story.append(t_ctrls)
        story.append(Spacer(1, 10))

        # Findings Table
        story.append(Paragraph("Prioritized Security Findings", heading_style))
        findings_data = [["Severity", "Rule ID", "Title", "Affected Connection"]]
        for f in findings:
            findings_data.append([
                str(f.get("severity")),
                str(f.get("rule_id")),
                str(f.get("title")),
                str(f.get("affected_connection", ""))[:35]
            ])

        t_findings = Table(findings_data, colWidths=[60, 130, 190, 140])
        t_findings.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0'))
        ]))
        story.append(t_findings)

        doc.build(story)
        print(f"[Report Generator] PDF Report generated: {output_path}")

def main():
    generator = ForensicReportGenerator()
    input_file = Path("part1/output/forensic_report.json")
    if not input_file.exists():
        print(f"Error: {input_file} not found.")
        return

    with open(input_file, "r") as f:
        data = json.load(f)

    generator.generate_html_report(data, "part1/output/forensic_report.html")
    generator.generate_pdf_report(data, "part1/output/forensic_report.pdf")

if __name__ == "__main__":
    main()
