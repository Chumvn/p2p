# P2P Share

[![GitHub](https://img.shields.io/badge/GitHub-Chumvn/p2p-blue?logo=github)](https://github.com/Chumvn/p2p)

Ứng dụng chia sẻ file P2P (peer-to-peer) trực tiếp giữa các thiết bị qua trình duyệt web, không cần server lưu trữ.

![P2P Share Preview](preview.png)

## ✨ Tính năng

- 🔄 **Truyền file trực tiếp P2P** - File đi thẳng từ thiết bị A đến B
- 🔐 **Bảo mật End-to-End** - Mã hóa WebRTC, không lưu trên server
- 📱 **Responsive** - Hoạt động tốt trên cả điện thoại và máy tính
- 🌙 **Dark/Light Mode** - Tự động theo hệ thống hoặc chọn thủ công
- 📷 **QR Code** - Scan để kết nối nhanh
- 🔗 **Chia sẻ link** - Gửi link trực tiếp cho người nhận
- ♾️ **Không giới hạn** - Gửi file bất kỳ kích thước

## 🚀 Cách sử dụng

### Người gửi:
1. Mở webapp
2. Copy **mã phòng** hoặc **link** chia sẻ cho người nhận
3. Hoặc cho người nhận scan **QR code**
4. Sau khi kết nối, kéo thả file vào để gửi

### Người nhận:
1. Mở webapp
2. Nhập **mã phòng** hoặc mở **link** được chia sẻ
3. Nhấn **Kết nối**
4. File sẽ tự động tải về khi được gửi

## 🛠️ Công nghệ

| Công nghệ | Mục đích |
|-----------|----------|
| **WebRTC** | Kết nối P2P trực tiếp |
| **PeerJS** | Signaling server (miễn phí) |
| **QRCode.js** | Tạo QR code |
| **CSS Neumorphism** | Giao diện |

## 🌐 Browser hỗ trợ

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ | ✅ |
| Safari | ✅ | ✅ (iOS 11+) |
| Firefox | ✅ | ✅ |
| Edge | ✅ | ✅ |

## 📦 Deploy

### GitHub Pages:
1. Fork repo này
2. Vào Settings > Pages
3. Chọn branch `main` và folder `/root`
4. Save và chờ deploy

### Tự host:
Chỉ cần upload các file lên bất kỳ static hosting nào (Netlify, Vercel, Cloudflare Pages, ...)

## 🔒 Bảo mật

- ✅ **Không lưu file trên server** - File truyền trực tiếp P2P
- ✅ **Mã hóa WebRTC (DTLS/SRTP)** - Dữ liệu được mã hóa
- ✅ **Không cần đăng nhập** - Không thu thập thông tin cá nhân
- ⚠️ **IP được chia sẻ** - 2 peer biết IP của nhau (bình thường với P2P)

## 📄 License

MIT License - Thoải mái sử dụng và chỉnh sửa!

---

**Designed & built by CHUM**
