# ByteVault

ByteVault is a self-hosted cloud storage application with a Netlify-compatible frontend and a local Node.js/SQLite backend.

## Architecture

- **Frontend**: A static HTML/CSS/Vanilla JS Single Page Application (SPA). Designed to be hosted on Netlify.
- **Backend**: A local Node.js + Express API. Connects to a SQLite database (`bytevault.db`).
- **Storage**: Real file storage on your local machine in the `Storage/` directory. 

## Requirements

- Node.js (v18+)
- npm

## Setup & Installation

### 1. Backend Setup

The backend handles all file storage, database management, and API requests. It *must* run on the computer where you want files to be stored.

```bash
cd backend
npm install
```

Ensure you have a `.env` file in the `backend` directory (copied from `../.env.example`):
```env
PORT=3000
JWT_SECRET=your_super_secret_key
DATABASE_PATH=./database/bytevault.db
STORAGE_PATH=../Storage
MAX_STORAGE_GB=60
MAX_USER_STORAGE_GB=5
FRONTEND_URL=https://your-netlify-site.netlify.app
```

Start the backend server:
```bash
npm start
```
The server will run on `http://localhost:3000` and automatically create the SQLite database in `backend/database/bytevault.db`.

### 2. Frontend Setup (Local Development)

To run the frontend locally, you can use any static file server from the root directory:
```bash
npx serve .
```
Navigate to the `frontend/index.html` file in your browser. (The frontend assumes the backend is running on `http://localhost:3000/api` if accessed via localhost).

### 3. Netlify Deployment

The frontend is ready to be deployed to Netlify. The repository includes a `netlify.toml` file to handle routing and build configurations.

1. Create a new site on Netlify.
2. Link your GitHub repository.
3. Set the Publish Directory to `frontend`.
4. Deploy the site.

**Important:** In `frontend/api.js`, you must update the `API_BASE` URL to point to your public backend URL instead of localhost.

### 4. Connecting the Backend to the Internet (Cloudflare Tunnel)

To make your local backend securely accessible from the Netlify frontend over the internet, you can use a Cloudflare Tunnel:

1. Install `cloudflared`.
2. Authenticate and create a tunnel: `cloudflared tunnel create bytevault-api`
3. Route traffic to your local port 3000: `cloudflared tunnel route dns bytevault-api api.yourdomain.com`
4. Run the tunnel: `cloudflared tunnel run bytevault-api`

Update your frontend's `API_BASE` to `https://api.yourdomain.com/api`.

## Managing Storage

ByteVault is configured to use your existing `Storage` folder in the project root.
- The `STORAGE_PATH` environment variable controls this location (`../Storage`).
- By default, users are limited to 5GB (`MAX_USER_STORAGE_GB=5`), and the entire system assumes a maximum of 60GB (`MAX_STORAGE_GB=60`).
- To backup ByteVault, simply back up the `Storage` directory and the `backend/database/bytevault.db` file.
# ByteVault
# ByteVault
