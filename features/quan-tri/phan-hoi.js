// Quản trị phản hồi: toàn bộ góp ý của sinh viên, lọc theo loại / trạng thái / mức độ,
// đổi trạng thái và trả lời (đồng bộ qua localStorage với trang Phản hồi của sinh viên).
document.addEventListener("DOMContentLoaded", () => {
  if (!ADMIN) return;
  createFeedbackInbox({
    scope: () => true,
    listEl: $id("list"),
    detailEl: $id("detail"),
    statsEl: $id("stats"),
    filters: { search: $id("search"), category: $id("category"), status: $id("status"), priority: $id("priority") },
    allowInternal: true,
    emptyText: "Chưa có phản hồi nào từ sinh viên.",
  });
});
