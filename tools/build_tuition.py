"""Thêm (hoặc tạo lại) 3 sheet học phí vào data/students.xlsx.

Cách chạy:  python tools/build_tuition.py   (cần: pip install openpyxl)
Sau đó chạy python tools/xlsx_to_js.py để cập nhật data/students.js cho trang web.

Quy tắc:
  - Học phí môn học: 550.000 VNĐ/môn ở Năm 1, tăng 10% mỗi năm
    (Năm 1 = 550.000, Năm 2 = 605.000, Năm 3 = 665.500, Năm 4 = 732.050).
  - Môn phải học phụ đạo (điểm < 2.0): cộng thêm 1.000.000 VNĐ/môn.
  - SV đạt tất cả các môn từ 2.0 trở lên: đã nộp đủ.
  - SV phải học phụ đạo: ngẫu nhiên (cố định theo SEED) nộp đủ hoặc còn nợ;
    nếu nợ thì khoản nợ là phí phụ đạo của một số môn chưa nộp.
  - Miễn giảm và Đã rút để 0 (điền tay nếu có).

Các cột tính toán dùng công thức Excel nên sửa "Đã nộp", "Miễn giảm"... là tự cập nhật.
Chạy lại script sẽ ghi đè 3 sheet học phí (các sheet khác giữ nguyên).
"""
import random
import re
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "students.xlsx"

BASE_FEE = 550_000      # học phí/môn Năm 1
YEARLY_INCREASE = 0.10  # tăng 10% mỗi năm
TUTOR_FEE = 1_000_000   # phí phụ đạo/môn
START_YEAR = 2025       # Năm 1 = 2025_2026
SEED = 2025             # đổi để ra kết quả ngẫu nhiên khác

CONFIG_SHEET = "Cấu Hình Học Phí"
DETAIL_SHEET = "Chi Tiết Học Phí"
SUMMARY_SHEET = "Tổng Hợp Học Phí"

HEADER_FILL = PatternFill("solid", fgColor="0B3D91")
HEADER_FONT = Font(bold=True, color="FFFFFF")
TITLE_FONT = Font(bold=True, size=14, color="0B3D91")
THIN = Side(style="thin", color="D6DEEB")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
MONEY = "#,##0"


def read_grades(ws):
    """Đọc sheet điểm: trả về danh sách môn (tên, năm) và sinh viên (msv, tên, lớp, điểm theo cột)."""
    year_row = [c.value for c in ws[1]]
    subject_row = [c.value for c in ws[2]]
    gpa_col = year_row.index("GPA")
    subjects, year = [], None
    for col in range(6, gpa_col):
        if year_row[col]:
            year = int(re.search(r"\d+", year_row[col]).group())
        if subject_row[col]:
            subjects.append({"col": col, "year": year})
    students = []
    for row in ws.iter_rows(min_row=3, values_only=True):
        if row[2]:
            students.append({"msv": str(int(row[2])), "name": row[1].strip(), "lop": row[3].strip(),
                             "grades": [(s["year"], row[s["col"]]) for s in subjects]})
    return students


def style_header(ws, row, ncols):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill, cell.font, cell.border = HEADER_FILL, HEADER_FONT, BORDER
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 32


def build_config(wb):
    ws = wb.create_sheet(CONFIG_SHEET)
    ws["A1"] = "CẤU HÌNH HỌC PHÍ"
    ws["A1"].font = TITLE_FONT
    rows = [("Học phí cơ bản / môn (Năm 1)", BASE_FEE, MONEY),
            ("Mức tăng mỗi năm", YEARLY_INCREASE, "0%"),
            ("Phí phụ đạo / môn (điểm < 2.0)", TUTOR_FEE, MONEY)]
    for i, (label, value, fmt) in enumerate(rows, start=3):
        ws.cell(row=i, column=1, value=label).font = Font(bold=True)
        cell = ws.cell(row=i, column=2, value=value)
        cell.number_format = fmt
        cell.fill = PatternFill("solid", fgColor="FFF7ED")
    ws["A7"], ws["B7"], ws["C7"] = "Năm học", "Đơn giá / môn", "Năm học (niên khóa)"
    style_header(ws, 7, 3)
    for n in range(1, 5):
        r = 7 + n
        ws.cell(row=r, column=1, value=f"Năm {n}")
        ws.cell(row=r, column=2, value=f"=ROUND($B$3*(1+$B$4)^{n - 1},0)").number_format = MONEY
        ws.cell(row=r, column=3, value=f"{START_YEAR + n - 1}_{START_YEAR + n}")
    ws.column_dimensions["A"].width = 34
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["C"].width = 20


def build_detail(wb, students, rng):
    ws = wb.create_sheet(DETAIL_SHEET)
    ws["A1"] = "CHI TIẾT HỌC PHÍ THEO NĂM HỌC"
    ws["A1"].font = TITLE_FONT
    ws.merge_cells("A1:S1")
    headers = ["MSV", "Họ và tên", "Lớp", "Năm học", "Niên khóa", "Số môn", "Đơn giá / môn",
               "Học phí môn học", "Số môn phụ đạo", "Phí phụ đạo", "Miễn giảm", "Phải nộp",
               "Đã nộp", "Đã rút", "Thừa", "Còn nợ", "Hạn nộp", "Số phiếu thu", "Ghi chú"]
    for c, h in enumerate(headers, start=1):
        ws.cell(row=3, column=c, value=h)
    style_header(ws, 3, len(headers))

    cfg = f"'{CONFIG_SHEET}'"
    r, receipt_no = 4, 0
    outcome = {}
    for st in students:
        by_year = {}
        for year, score in st["grades"]:
            if score is None:
                continue
            y = by_year.setdefault(year, {"count": 0, "tutor": 0})
            y["count"] += 1
            y["tutor"] += score < 2.0

        total_tutor = sum(y["tutor"] for y in by_year.values())
        # Đạt hết các môn (>= 2.0) -> nộp đủ; có môn phụ đạo -> ngẫu nhiên nộp đủ / còn nợ
        in_debt = total_tutor > 0 and rng.random() < 0.5
        unpaid = {}
        if in_debt:
            # Số môn phụ đạo chưa nộp phí ở mỗi năm (ít nhất 1 môn trên toàn khóa)
            slots = [y for y, v in by_year.items() for _ in range(v["tutor"])]
            for y in rng.sample(slots, rng.randint(1, len(slots))):
                unpaid[y] = unpaid.get(y, 0) + 1
        outcome[st["msv"]] = "Còn nợ" if in_debt else "Đã hoàn thành"

        for year in sorted(by_year):
            v = by_year[year]
            fee = round(BASE_FEE * (1 + YEARLY_INCREASE) ** (year - 1))
            payable = v["count"] * fee + v["tutor"] * TUTOR_FEE
            paid = payable - unpaid.get(year, 0) * TUTOR_FEE
            receipt = ""
            if paid > 0:
                receipt_no += 1
                receipt = f"PT{START_YEAR + year - 1}-{receipt_no:05d}"
            note = f"Chưa nộp phí phụ đạo {unpaid[year]} môn" if unpaid.get(year) else ""
            row = [st["msv"], st["name"], st["lop"], f"Năm {year}",
                   f"{START_YEAR + year - 1}_{START_YEAR + year}", v["count"],
                   f"=VLOOKUP(D{r},{cfg}!$A$8:$B$11,2,FALSE)", f"=F{r}*G{r}", v["tutor"],
                   f"=I{r}*{cfg}!$B$5", 0, f"=H{r}+J{r}-K{r}", paid, 0,
                   f"=MAX(0,M{r}-N{r}-L{r})", f"=MAX(0,L{r}-(M{r}-N{r}))",
                   f"30/09/{START_YEAR + year - 1}", receipt, note]
            for c, val in enumerate(row, start=1):
                cell = ws.cell(row=r, column=c, value=val)
                cell.border = BORDER
                if c in (7, 8, 10, 11, 12, 13, 14, 15, 16):
                    cell.number_format = MONEY
            r += 1

    widths = [12, 26, 26, 10, 12, 8, 14, 16, 10, 14, 12, 16, 16, 10, 12, 14, 12, 15, 30]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "D4"
    ws.auto_filter.ref = f"A3:S{r - 1}"
    return outcome, r - 1


def build_summary(wb, students, last_detail_row):
    ws = wb.create_sheet(SUMMARY_SHEET)
    ws["A1"] = "TỔNG HỢP HỌC PHÍ THEO SINH VIÊN"
    ws["A1"].font = TITLE_FONT
    ws.merge_cells("A1:K1")
    headers = ["MSV", "Họ và tên", "Lớp", "Học phí môn học", "Phí phụ đạo", "Miễn giảm",
               "Học phí phải nộp", "Học phí đã nộp", "Học phí thừa", "Học phí còn nợ", "Trạng thái"]
    for c, h in enumerate(headers, start=1):
        ws.cell(row=3, column=c, value=h)
    style_header(ws, 3, len(headers))

    d = f"'{DETAIL_SHEET}'"
    rng_a = f"{d}!$A$4:$A${last_detail_row}"
    sumif = lambda col, r: f"=SUMIFS({d}!${col}$4:${col}${last_detail_row},{rng_a},A{r})"
    for i, st in enumerate(students):
        r = 4 + i
        row = [st["msv"], st["name"], st["lop"], sumif("H", r), sumif("J", r), sumif("K", r),
               sumif("L", r), f"=SUMIFS({d}!$M$4:$M${last_detail_row},{rng_a},A{r})-SUMIFS({d}!$N$4:$N${last_detail_row},{rng_a},A{r})",
               sumif("O", r), sumif("P", r), f'=IF(J{r}>0,"Còn nợ","Đã hoàn thành")']
        for c, val in enumerate(row, start=1):
            cell = ws.cell(row=r, column=c, value=val)
            cell.border = BORDER
            if 4 <= c <= 10:
                cell.number_format = MONEY
    for i, w in enumerate([12, 26, 26, 16, 14, 12, 18, 18, 14, 16, 16], start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "D4"
    ws.auto_filter.ref = f"A3:K{3 + len(students)}"


def main():
    wb = openpyxl.load_workbook(SRC)  # giữ nguyên công thức của các sheet cũ
    for name in (CONFIG_SHEET, DETAIL_SHEET, SUMMARY_SHEET):
        if name in wb.sheetnames:
            del wb[name]
    students = read_grades(openpyxl.load_workbook(SRC, data_only=True).worksheets[0])
    rng = random.Random(SEED)

    build_config(wb)
    outcome, last_row = build_detail(wb, students, rng)
    build_summary(wb, students, last_row)
    wb.calculation.fullCalcOnLoad = True  # Excel tự tính lại công thức khi mở file
    wb.save(SRC)

    debt = sum(v == "Còn nợ" for v in outcome.values())
    print(f"Đã ghi 3 sheet học phí: {len(students)} SV, {last_row - 3} dòng chi tiết, "
          f"{debt} SV còn nợ, {len(students) - debt} SV đã hoàn thành.")


if __name__ == "__main__":
    main()
