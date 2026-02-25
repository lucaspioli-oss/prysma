import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from ofxparse import OfxParser
from openpyxl import load_workbook

from app.models.receivable import Receivable
from app.models.payment import Payment

# Patterns for column detection
CNPJ_PATTERN = re.compile(r"^\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}$")
CPF_PATTERN = re.compile(r"^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$")
DATE_FORMATS = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y", "%m/%d/%Y"]

# Column name heuristics (Portuguese)
VALUE_HINTS = ["valor", "value", "montante", "amount", "total", "face_value", "vl_", "vlr"]
DATE_HINTS = ["data", "date", "vencimento", "due", "dt_", "emissao", "pagamento"]
CNPJ_HINTS = ["cnpj", "cpf", "documento", "doc", "sacado", "pagador", "cedente", "devedor"]
NAME_HINTS = ["nome", "name", "razao", "razão", "sacado", "pagador", "cedente", "devedor"]


def normalize_cnpj(value: str) -> str:
    """Remove punctuation from CNPJ/CPF."""
    return re.sub(r"[.\-/]", "", value.strip())


def parse_monetary_value(value: str) -> Decimal | None:
    """Parse Brazilian monetary values: 1.234,56 or 1234.56"""
    if not value or not value.strip():
        return None
    v = value.strip().replace("R$", "").replace(" ", "")
    # Brazilian format: 1.234,56
    if "," in v and "." in v:
        v = v.replace(".", "").replace(",", ".")
    elif "," in v:
        v = v.replace(",", ".")
    try:
        return Decimal(v)
    except InvalidOperation:
        return None


def parse_date(value: str) -> date | None:
    """Try multiple date formats."""
    if not value or not value.strip():
        return None
    v = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    return None


def detect_column_type(header: str, sample_values: list[str]) -> str:
    """Detect what type of data a column contains."""
    h = header.lower().strip()

    # Check header name first — more specific hints take priority
    # "nome" and "name" are checked BEFORE generic hints like "sacado"
    if any(hint in h for hint in ["nome", "name", "razao", "razão"]):
        return "name"
    if any(hint in h for hint in ["cnpj", "cpf", "documento", "doc"]):
        return "cnpj"
    if any(hint in h for hint in VALUE_HINTS):
        return "value"
    if any(hint in h for hint in DATE_HINTS):
        return "date"
    # Generic hints (could be name or cnpj — use sample values to decide)
    if any(hint in h for hint in ["sacado", "pagador", "cedente", "devedor"]):
        non_empty = [v for v in sample_values if v and v.strip()]
        cnpj_matches = sum(1 for v in non_empty if CNPJ_PATTERN.match(v.strip()) or CPF_PATTERN.match(v.strip()))
        if cnpj_matches > len(non_empty) * 0.3:
            return "cnpj"
        return "name"

    # Check sample values
    non_empty = [v for v in sample_values if v and v.strip()]
    if not non_empty:
        return "unknown"

    cnpj_matches = sum(1 for v in non_empty if CNPJ_PATTERN.match(v.strip()) or CPF_PATTERN.match(v.strip()))
    if cnpj_matches > len(non_empty) * 0.5:
        return "cnpj"

    value_matches = sum(1 for v in non_empty if parse_monetary_value(v) is not None)
    if value_matches > len(non_empty) * 0.7:
        return "value"

    date_matches = sum(1 for v in non_empty if parse_date(v) is not None)
    if date_matches > len(non_empty) * 0.7:
        return "date"

    return "name"


def parse_csv_content(content: bytes) -> dict:
    """Parse CSV content with smart column detection."""
    # Try different encodings
    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("Could not decode file. Try UTF-8 or Latin-1 encoding.")

    reader = csv.reader(io.StringIO(text), delimiter=_detect_delimiter(text))
    rows = list(reader)

    if len(rows) < 2:
        raise ValueError("File must have at least a header row and one data row.")

    headers = rows[0]
    data_rows = rows[1:]

    # Detect column types
    column_map: dict[str, list[int]] = {}
    for i, header in enumerate(headers):
        samples = [row[i] for row in data_rows[:20] if i < len(row)]
        col_type = detect_column_type(header, samples)
        if col_type not in column_map:
            column_map[col_type] = []
        column_map[col_type].append(i)

    file_type = _detect_file_type(headers)
    return _build_records(column_map, data_rows, "csv", file_type)


def parse_xlsx_content(content: bytes) -> dict:
    """Parse XLSX content with smart column detection."""
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active

    rows = []
    for row in ws.iter_rows(values_only=True):
        rows.append([str(cell) if cell is not None else "" for cell in row])

    if len(rows) < 2:
        raise ValueError("File must have at least a header row and one data row.")

    headers = rows[0]
    data_rows = rows[1:]

    column_map = {}
    for i, header in enumerate(headers):
        samples = [row[i] for row in data_rows[:20] if i < len(row)]
        col_type = detect_column_type(header, samples)
        if col_type not in column_map:
            column_map[col_type] = []
        column_map[col_type].append(i)

    file_type = _detect_file_type(headers)
    return _build_records(column_map, data_rows, "xlsx", file_type)


def _detect_delimiter(text: str) -> str:
    """Detect CSV delimiter (comma, semicolon, tab)."""
    first_line = text.split("\n")[0]
    for delim in [";", ",", "\t", "|"]:
        if delim in first_line:
            return delim
    return ","


def _detect_file_type(headers: list[str]) -> str:
    """Detect if file contains receivables or payments based on headers."""
    all_headers = " ".join(h.lower() for h in headers)
    payment_hints = ["pagamento", "pagador", "pago", "paga", "payment", "paid", "extrato"]
    receivable_hints = ["recebivel", "recebiveis", "sacado", "cedente", "vencimento", "receivable"]

    pay_score = sum(1 for h in payment_hints if h in all_headers)
    rec_score = sum(1 for h in receivable_hints if h in all_headers)

    if pay_score > rec_score:
        return "payment"
    return "receivable"


def _build_records(column_map: dict, data_rows: list, source: str, file_type: str = "receivable") -> dict:
    """Build Receivable/Payment records from detected columns."""
    receivables = []
    payments = []
    errors = []

    value_cols = column_map.get("value", [])
    date_cols = column_map.get("date", [])
    cnpj_cols = column_map.get("cnpj", [])
    name_cols = column_map.get("name", [])

    if not value_cols:
        raise ValueError("Could not detect a value/amount column in the file.")

    for row_idx, row in enumerate(data_rows):
        try:
            value = None
            for col in value_cols:
                if col < len(row):
                    value = parse_monetary_value(row[col])
                    if value is not None:
                        break

            if value is None or value == 0:
                continue

            record_date = None
            for col in date_cols:
                if col < len(row):
                    record_date = parse_date(row[col])
                    if record_date is not None:
                        break

            cnpj = None
            for col in cnpj_cols:
                if col < len(row):
                    raw = row[col].strip()
                    if raw:
                        cnpj = normalize_cnpj(raw)
                        break

            name = None
            for col in name_cols:
                if col < len(row):
                    raw = row[col].strip()
                    if raw:
                        name = raw
                        break

            abs_value = abs(value)
            is_payment = file_type == "payment" or value < 0

            if is_payment:
                payments.append(Payment(
                    payer_cnpj=cnpj,
                    payer_name=name,
                    amount=abs_value,
                    date=record_date,
                    source=source,
                ))
            else:
                receivables.append(Receivable(
                    debtor_cnpj=cnpj,
                    debtor_name=name,
                    face_value=abs_value,
                    due_date=record_date,
                    source=source,
                ))

        except Exception as e:
            errors.append({"row": row_idx + 2, "error": str(e)})

    return {"receivables": receivables, "payments": payments, "errors": errors}


def parse_ofx_content(content: bytes) -> dict:
    """Parse OFX bank statement. All transactions become payments."""
    try:
        ofx = OfxParser.parse(io.BytesIO(content))
    except Exception:
        raise ValueError("Could not parse OFX file. Make sure it is a valid bank statement.")

    payments = []
    errors = []

    if not ofx.account or not ofx.account.statement or not ofx.account.statement.transactions:
        raise ValueError("OFX file has no transactions.")

    for i, txn in enumerate(ofx.account.statement.transactions):
        try:
            amount = Decimal(str(txn.amount))
            if amount == 0:
                continue

            txn_date = txn.date.date() if isinstance(txn.date, datetime) else txn.date

            # OFX memo/payee often contain the payer name
            payer_name = txn.payee or txn.memo or None
            if payer_name:
                payer_name = payer_name.strip()

            # Try to extract CNPJ/CPF from memo or check number
            payer_cnpj = None
            search_text = f"{txn.memo or ''} {txn.payee or ''} {txn.checknum or ''}"
            # Use patterns without anchors for searching within text
            cnpj_search = re.search(r"\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}", search_text)
            cpf_search = re.search(r"\d{3}\.?\d{3}\.?\d{3}-?\d{2}", search_text)
            if cnpj_search:
                payer_cnpj = normalize_cnpj(cnpj_search.group())
            elif cpf_search:
                payer_cnpj = normalize_cnpj(cpf_search.group())

            payments.append(Payment(
                payer_cnpj=payer_cnpj,
                payer_name=payer_name,
                amount=abs(amount),
                date=txn_date,
                bank_reference=txn.id or txn.checknum or None,
                source="ofx",
            ))
        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})

    return {"receivables": [], "payments": payments, "errors": errors}


def parse_file(content: bytes, filename: str) -> dict:
    """Route to the correct parser based on file extension."""
    if filename.endswith(".csv"):
        return parse_csv_content(content)
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        return parse_xlsx_content(content)
    elif filename.endswith(".ofx"):
        return parse_ofx_content(content)
    else:
        raise ValueError(f"Unsupported file type: {filename}. Use CSV, XLSX or OFX.")
