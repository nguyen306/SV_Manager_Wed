// Danh mục sách thư viện — DỮ LIỆU MẪU (thay bằng danh mục thật của thư viện trường).
// total:  tổng số quyển thư viện có
// onLoan: số quyển đang được sinh viên khác mượn (ngoài các lượt mượn lưu trên trình duyệt này)
window.BOOKS = [
  { id: "B001", title: "The C++ Programming Language", author: "Bjarne Stroustrup", category: "Lập trình", tags: "C++ lập trình hướng đối tượng", shelf: "Kệ A1 · Tầng 2", total: 5, onLoan: 2 },
  { id: "B002", title: "Effective C++", author: "Scott Meyers", category: "Lập trình", tags: "C++", shelf: "Kệ A1 · Tầng 2", total: 3, onLoan: 3 },
  { id: "B003", title: "Head First Java", author: "Kathy Sierra, Bert Bates", category: "Lập trình", tags: "Java lập trình hướng đối tượng", shelf: "Kệ A2 · Tầng 2", total: 4, onLoan: 1 },
  { id: "B004", title: "Clean Code", author: "Robert C. Martin", category: "Lập trình", tags: "kỹ thuật phần mềm", shelf: "Kệ A2 · Tầng 2", total: 4, onLoan: 2 },
  { id: "B005", title: "Design Patterns", author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides", category: "Lập trình", tags: "mẫu thiết kế hướng đối tượng", shelf: "Kệ A3 · Tầng 2", total: 2, onLoan: 0 },
  { id: "B006", title: "Introduction to Algorithms", author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein", category: "Cấu trúc dữ liệu & Giải thuật", tags: "thuật toán và ứng dụng", shelf: "Kệ B1 · Tầng 2", total: 6, onLoan: 4 },
  { id: "B007", title: "Data Structures and Algorithms in C++", author: "Michael T. Goodrich, Roberto Tamassia, David M. Mount", category: "Cấu trúc dữ liệu & Giải thuật", tags: "C++ cấu trúc dữ liệu", shelf: "Kệ B1 · Tầng 2", total: 5, onLoan: 2 },
  { id: "B008", title: "Database System Concepts", author: "Abraham Silberschatz, Henry F. Korth, S. Sudarshan", category: "Cơ sở dữ liệu", tags: "SQL", shelf: "Kệ C1 · Tầng 3", total: 4, onLoan: 1 },
  { id: "B009", title: "Fundamentals of Database Systems", author: "Ramez Elmasri, Shamkant B. Navathe", category: "Cơ sở dữ liệu", tags: "SQL mô hình quan hệ", shelf: "Kệ C1 · Tầng 3", total: 3, onLoan: 3 },
  { id: "B010", title: "Computer Networking: A Top-Down Approach", author: "James F. Kurose, Keith W. Ross", category: "Mạng máy tính", tags: "TCP/IP", shelf: "Kệ C2 · Tầng 3", total: 5, onLoan: 2 },
  { id: "B011", title: "Computer Networks", author: "Andrew S. Tanenbaum", category: "Mạng máy tính", tags: "TCP/IP", shelf: "Kệ C2 · Tầng 3", total: 3, onLoan: 1 },
  { id: "B012", title: "HTML and CSS: Design and Build Websites", author: "Jon Duckett", category: "Thiết kế & Lập trình Web", tags: "thiết kế web HTML CSS", shelf: "Kệ D1 · Tầng 3", total: 6, onLoan: 3 },
  { id: "B013", title: "Eloquent JavaScript", author: "Marijn Haverbeke", category: "Thiết kế & Lập trình Web", tags: "lập trình web JavaScript", shelf: "Kệ D1 · Tầng 3", total: 4, onLoan: 1 },
  { id: "B014", title: "Calculus", author: "James Stewart", category: "Toán học", tags: "giải tích", shelf: "Kệ E1 · Tầng 1", total: 5, onLoan: 2 },
  { id: "B015", title: "Linear Algebra and Its Applications", author: "David C. Lay", category: "Toán học", tags: "đại số tuyến tính", shelf: "Kệ E1 · Tầng 1", total: 4, onLoan: 1 },
  { id: "B016", title: "Giáo trình Triết học Mác - Lênin", author: "Bộ Giáo dục và Đào tạo", category: "Lý luận chính trị", tags: "triết học", shelf: "Kệ F1 · Tầng 1", total: 8, onLoan: 3 },
  { id: "B017", title: "Giáo trình Tư tưởng Hồ Chí Minh", author: "Bộ Giáo dục và Đào tạo", category: "Lý luận chính trị", tags: "tư tưởng", shelf: "Kệ F1 · Tầng 1", total: 8, onLoan: 2 },
];
