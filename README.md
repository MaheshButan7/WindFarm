# Wind Asset Intelligence Platform

## Overview
An **AI-powered wind turbine asset intelligence dashboard** that simulates and visualizes turbine telemetry in real-time. The platform detects abnormal behavior, predicts component risk, explains performance issues, and recommends maintenance actions. 

This project is currently a **frontend-only client demonstration**. It uses a built-in synthetic data engine to simulate 30 wind turbines across 3 farms, generating realistic telemetry (like wind speed, rpm, temperature, and vibration) and triggering predictive alerts.

## Setup

Getting the project running locally is extremely simple, as it requires no backend databases or Python environments.

1. **Install dependencies:**
   ```powershell
   cd frontend
   npm install
   ```

2. **Run the development server:**
   ```powershell
   npm run dev
   ```

3. **Open the App:**
   Navigate to `http://localhost:5173` in your web browser.

## Architecture
The application runs entirely in the browser. It follows a clean separation of concerns:
- **Synthetic Backend (`simulator.ts`)**: Acts as a mock server running inside the browser. It ticks every second, calculating physics-based power curves, injecting noise, running heuristic risk models, and dispatching alerts.
- **State Management**: The React frontend subscribes to the simulator's state using a global Context, ensuring that all UI components instantly re-render when new telemetry arrives.
- **Mock Services Layer**: A modular abstraction that allows the current synthetic data source to be easily replaced with real API calls and WebSockets in the future.

## Tech Stack
- **Core**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS Modules (for scoped, collision-free styling) and CSS Variables for theming.
- **Icons**: Lucide React
- **Routing**: React Router DOM

## Folder Structure
The codebase follows a standard, feature-sliced React architecture:
```text
frontend/src/
├── components/   # Reusable, stateless UI components (Cards, Pills, Buttons)
├── contexts/     # React Contexts for global state (Live Simulator subscription)
├── features/     # Complex, domain-specific UI (Telemetry Panel, Turbine Tiles)
├── layouts/      # Structural page wrappers (Sidebar, Header, MainLayout)
├── pages/        # Top-level route views (Overview, Turbines, Alerts, etc.)
├── services/     # Core business logic (Simulator, AI Copilot, Types)
├── styles/       # Global CSS tokens and themes
└── utils/        # General helper functions (Classname merging)
```

## Features
- **Real-Time Overview**: Live KPI monitoring of fleet health, availability, active alerts, and power generation vs expected performance.
- **Interactive Asset Map**: GIS-style visual map representing all turbines and their current status color-coded in real-time.
- **Deep Diagnostics (Turbine Detail)**: Deep dive into 28+ realtime parameters for individual turbines, grouped into logical categories (Mechanical, Electrical, Environmental, etc.).
- **Predictive Alert Center**: A fully functional alert management system with dynamic side-bar filtering and a centered modal for deep-diving into the incident timeline and evidence.
- **Maintenance Planning**: Automated categorization of risk-based maintenance tasks with actionable recommendations.
- **Simulated AI Copilot**: A mock AI assistant that analyzes active telemetry and provides conversational explanations of current issues.

## Future Work
- **Backend Integration**: Replace the frontend simulator with a real backend service (e.g., Python/FastAPI) connected to actual SCADA systems or a timeseries database (PostgreSQL/TimescaleDB).
- **Authentication**: Add user login, role-based access control (RBAC), and session management.
- **Real AI Integration**: Connect the Copilot feature to a real Large Language Model (LLM) API (like OpenAI or Gemini) with retrieval-augmented generation (RAG) over maintenance manuals.
- **Advanced Charting**: Integrate robust charting libraries (like Chart.js or Recharts) for deeper historical trend analysis.
- **Responsive Mobile Polish**: While responsive, further optimization for mobile devices and field-technician tablets.
