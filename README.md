# ShopFast

ShopFast là nền tảng thương mại điện tử mẫu được xây dựng theo hướng production-ready. Dự án gồm backend NestJS, giao diện demo React và bộ hạ tầng Docker cho PostgreSQL, Redis, Nginx, WebSocket và BullMQ.

## 1. Kiến trúc tổng quan

```text
Trình duyệt
    |
    v
Nginx :80
    |-- /        -> Frontend React/Vite
    |-- /api     -> Backend NestJS :3000
    |-- /health  -> Health check backend
    |-- /socket.io -> WebSocket realtime
    `-- /admin/queues -> BullMQ Dashboard

Backend NestJS
    |-- PostgreSQL 16: dữ liệu nghiệp vụ
    `-- Redis 7: cache, rate limit, Pub/Sub và BullMQ
```

Backend được tổ chức theo module và luồng xử lý chính:

```text
Controller -> Service -> Repository/TypeORM -> PostgreSQL
                         |
                         |-> Redis cache và resilience fallback
                         |-> BullMQ jobs
                         `-> WebSocket events
```

## 2. Các tính năng chính

- Xác thực JWT với Access Token/Refresh Token.
- Phân quyền `CUSTOMER`, `AGENT`, `WAREHOUSE`, `ADMIN` bằng `@Roles(...)`.
- Quản lý người dùng, sản phẩm, tồn kho, đơn hàng, chi tiết đơn và ticket hỗ trợ.
- Checkout kiểm tra tồn kho trong transaction, tránh đặt vượt số lượng còn lại.
- Redis cache cho danh sách/chi tiết sản phẩm, cache invalidation khi cập nhật giá hoặc tồn kho, mutex chống cache stampede và fallback về PostgreSQL khi Redis gặp sự cố.
- Rate limit toàn cục 100 request/phút; các endpoint nhạy cảm như login, gửi OTP và checkout giới hạn 5 request/phút.
- Theo dõi đơn hàng realtime bằng Socket.IO, Redis adapter và room `order:{orderId}`. Chỉ chủ đơn hoặc nhân viên được phân quyền mới được subscribe.
- AI Support Agent với endpoint chat, function calling cho tra cứu trạng thái đơn/tồn kho và quy trình Human-in-the-Loop cho proposal cần nhân viên phê duyệt.
- BullMQ cho các queue `email`, `invoice`, `partner-sync` và dead-letter queue.
- Cron nhắc đơn chưa thanh toán sau 30 phút và tạo báo cáo doanh thu hằng ngày lúc nửa đêm.
- Swagger tại `/api/docs`, health check tại `/health` và BullMQ Dashboard tại `/admin/queues`.
- Docker multi-stage cho backend/frontend, Nginx reverse proxy và workflow CI/CD có healthcheck/rollback cho AWS EC2.

## 3. Công nghệ

- Backend: Node.js 20 LTS, NestJS 10, TypeScript, TypeORM, Jest.
- Database: PostgreSQL 16.
- Cache/queue/pub-sub: Redis 7, BullMQ, Socket.IO Redis Adapter.
- Frontend: React 18, Vite, Tailwind CSS, Socket.IO Client.
- Vận hành: Docker Compose, Nginx, GitHub Actions.

## 4. Chạy nhanh bằng Docker Compose

### Yêu cầu

- Docker Desktop hoặc Docker Engine có Docker Compose.
- Cổng trống: `80`, `3000`, `5173`, `5432`, `6379`.

### Khởi động

Từ thư mục gốc dự án:

```bash
copy .env.example .env
docker compose up -d --build
```

Trên macOS/Linux, dùng:

```bash
cp .env.example .env
docker compose up -d --build
```

Các địa chỉ sau sẽ sẵn sàng:

| Thành phần | Địa chỉ |
| --- | --- |
| Giao diện demo qua Nginx | http://localhost |
| Backend trực tiếp | http://localhost:3000 |
| Frontend dev container | http://localhost:5173 |
| Swagger | http://localhost/api/docs hoặc http://localhost:3000/api/docs |
| Health check | http://localhost/health hoặc http://localhost:3000/health |
| BullMQ Dashboard | http://localhost/admin/queues hoặc http://localhost:3000/admin/queues |

Xem log hoặc dừng hệ thống:

```bash
docker compose logs -f backend
docker compose ps
docker compose down
```

## 5. Chạy riêng trong môi trường phát triển

### Khởi động dependency

Có thể chạy PostgreSQL và Redis bằng Docker:

```bash
docker compose up -d postgres redis
```

### Backend

```bash
cd backend
npm install
npm run start:dev
```

Backend chạy ở `http://localhost:3000`.

### Frontend

Mở terminal khác:

```bash
cd frontend
npm install
npm run dev
```

Frontend Vite mặc định chạy ở `http://localhost:5173`.

### Dữ liệu demo

Sau khi PostgreSQL đã healthy, chạy seed từ thư mục `backend`:

```bash
npm run seed
```

Seed tạo bốn tài khoản, năm sản phẩm và một đơn hàng mẫu. Các tài khoản demo dùng mật khẩu chung:

```text
ShopFast@2026
```

| Vai trò | Email |
| --- | --- |
| ADMIN | admin@shopfast.vn |
| AGENT | agent@shopfast.vn |
| WAREHOUSE | warehouse@shopfast.vn |
| CUSTOMER | customer@shopfast.vn |

Chỉ sử dụng các tài khoản và secret mặc định cho development. Khi triển khai thật, phải thay toàn bộ mật khẩu, JWT secret, Redis password và thông tin database.

## 6. Cấu hình môi trường

File mẫu là `.env.example`. Backend cũng có thể đọc `backend/.env` khi chạy riêng. Các biến quan trọng:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `PORT` | `3000` | Cổng backend |
| `DB_HOST` | `localhost` | Host PostgreSQL |
| `DB_PORT` | `5432` | Cổng PostgreSQL |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `shopfast` / `shopfast_secret` / `shopfast_db` | Thông tin database |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Kết nối Redis |
| `REDIS_PASSWORD` | `redis_secret` | Mật khẩu Redis |
| `JWT_ACCESS_SECRET` | secret development | Secret Access Token |
| `JWT_REFRESH_SECRET` | secret development | Secret Refresh Token |
| `JWT_ACCESS_EXPIRATION` | `15m` | Thời hạn Access Token |
| `JWT_REFRESH_EXPIRATION` | `7d` | Thời hạn Refresh Token |
| `THROTTLE_TTL` | `60000` | Cửa sổ rate limit, tính bằng ms |
| `THROTTLE_LIMIT` | `100` | Số request mặc định trong cửa sổ |
| `AI_PROVIDER` | `mock` | Provider AI đang sử dụng |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | rỗng | API key tùy provider |

Trong môi trường production nên đặt `DB_SYNCHRONIZE=false`, quản lý schema bằng migration và dùng secret từ secret manager thay vì file `.env`.

## 7. API và xác thực

Các route nghiệp vụ có prefix `/api`:

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me`.
- `GET /api/products`, `GET /api/products/:id`, `GET /api/products/sku/:sku`.
- `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id` cho role phù hợp.
- `POST /api/orders/checkout`, `GET /api/orders`, `GET /api/orders/:id`.
- `PATCH /api/orders/:id/status`, `PATCH /api/orders/:id/payment` cho nhân viên được phân quyền.
- `POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`.
- `POST /api/ai-agent/chat`, các route proposal để nhân viên xem và xác nhận.

Gửi Access Token trong header:

```http
Authorization: Bearer <access-token>
```

Swagger là nơi xem đầy đủ DTO, response và thử API trực tiếp.

## 8. Realtime order tracking

Client Socket.IO kết nối đến backend/Nginx và gửi JWT trong handshake:

```ts
io('http://localhost', {
  auth: { token: accessToken },
});
```

Các event chính:

- Client gửi `subscribe_order` với `{ orderId }` để vào room đơn hàng.
- Server trả `order_subscribed` kèm trạng thái hiện tại để hỗ trợ reconnect và đồng bộ lại.
- Server phát `order_status_updated` khi trạng thái đơn thay đổi.
- Client gửi `unsubscribe_order` khi không cần theo dõi.

## 9. Queue và tác vụ định kỳ

BullMQ Dashboard hiển thị các queue:

- `email`: email xác nhận đơn và nhắc đơn chưa thanh toán.
- `invoice`: tạo hóa đơn.
- `partner-sync`: đồng bộ tồn kho đối tác.
- `dead-letter-queue`: lưu job thất bại cần kiểm tra.

Job có retry với exponential backoff, tối đa năm lần và có cơ chế idempotency để tránh xử lý trùng.

## 10. Cấu trúc thư mục

```text
backend/src/
  common/                 Guard, filter, decorator, throttler
  config/                 Cấu hình ứng dụng
  database/               Database module và seed
  modules/
    auth/                 JWT, đăng ký, đăng nhập, OTP
    users/                Người dùng và role
    products/             Sản phẩm, tồn kho, cache
    orders/               Checkout và trạng thái đơn
    events/               WebSocket và Redis adapter
    queues/               BullMQ processor, cron, dashboard
    tickets/              Support ticket và HITL proposal
    ai-agent/             AI chat và function calling
    health/               DB/Redis health check

frontend/src/
  api.ts                  API client
  socket.ts               Socket.IO client
  components/             Header, catalog, order tracker
  types.ts                Kiểu dữ liệu frontend

nginx/                    Reverse proxy và WebSocket routing
scripts/                  Deploy, rollback và seed helper
.github/workflows/        CI/CD pipeline
```

## 11. Deploy và rollback

Workflow `.github/workflows/deploy.yml` chạy khi push hoặc pull request vào `main`/`master`. Khi push vào `main`, workflow build image theo `$GITHUB_SHA` và có thể deploy lên AWS EC2 qua SSH.

Trên máy deploy:

```bash
bash scripts/deploy.sh
```

Nếu health check backend thất bại, script gọi rollback tự động. Có thể rollback thủ công:

```bash
bash scripts/rollback.sh
```

Các secret CI/CD cần thiết tùy cách triển khai gồm `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `EC2_HOST`, `EC2_USER` và `EC2_SSH_KEY`.

## 12. Lưu ý production

- Thay toàn bộ secret mặc định và không commit `.env` chứa thông tin thật.
- Giới hạn `CORS_ORIGIN`, không dùng `origin: '*'` cho môi trường production.
- Tắt `DB_SYNCHRONIZE` và dùng migration trước khi có dữ liệu thật.
- Bảo vệ BullMQ Dashboard bằng authentication hoặc network policy.
- Cấu hình TLS ở reverse proxy, log tập trung và backup PostgreSQL/Redis phù hợp.
- Kiểm tra health, queue failure và dung lượng volume trước mỗi lần deploy.

## 13. Trạng thái tài liệu

README này mô tả code và cấu hình hiện có trong repository. Provider AI mặc định là `mock`; muốn dùng Gemini hoặc OpenAI cần hoàn thiện/cấu hình provider tương ứng và cung cấp API key trong môi trường chạy.