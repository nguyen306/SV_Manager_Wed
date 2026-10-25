// Học vụ: phản hồi loại "Đào tạo" của SV thuộc các lớp giảng viên phụ trách,
// về môn giảng viên dạy (hoặc SV không chọn môn).
document.addEventListener("DOMContentLoaded", () => {
  if (!TEACHER) return;

  const subjects = new Set(TEACHER.subjects || []);
  const classes = new Set(TEACHER.classes || []);
  const subjectEl = $id("subject");
  [...subjects].sort().forEach((s) => subjectEl.insertAdjacentHTML("beforeend", `<option>${esc(s)}</option>`));

  createFeedbackInbox({
    scope: (x) => x.category === "dao-tao" && classes.has(x.lop) && (!x.subject || subjects.has(x.subject)),
    listEl: $id("list"),
    detailEl: $id("detail"),
    statsEl: $id("stats"),
    filters: { search: $id("search"), status: $id("status"), subject: subjectEl },
    allowInternal: true,
    emptyText: "Chưa có câu hỏi học vụ nào từ sinh viên các lớp bạn phụ trách.",
  });
});
