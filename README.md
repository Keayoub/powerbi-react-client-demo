# Power BI React Client Demo

A simple React application for embedding Power BI reports, with performance monitoring, error recovery, and developer tools.

---

## 🚀 Features

- **Embed Power BI Reports** in React
- **Performance Dashboard**: Real-time metrics (memory, API calls, iframe count)
- **Error Recovery**: Detects and guides recovery for Power BI authentication errors
- **Report Selection**: Browse and select reports
- **Responsive Design**: Works on all screen sizes
- **Testing Tools**: Trigger errors, export metrics, monitor page state

---

## 📋 Prerequisites

- Node.js (v16+)
- npm or yarn
- Azure AD App Registration
- Power BI Pro or Premium license
- Access to Power BI workspaces

---

## ⚙️ Setup

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd powerbi-react-client-demo
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Azure AD**

   - Register an app in [Azure Portal](https://portal.azure.com)
   - Add redirect URIs: `https://localhost:9000`, `http://localhost:9000`
   - Enable "Access tokens" and "ID tokens" in authentication
   - Add Power BI API permissions: `Dataset.Read.All`, `Report.Read.All`, `Workspace.Read.All`, `Content.Create`, `Metadata.View_Any`

4. **Set Environment Variables**

   - Copy `.env.local.template` to `.env.local`
   - Fill in your Azure AD Client ID, Tenant ID, and Redirect URI

5. **Power BI Setup**
   - Enable service principal in Power BI Admin Portal
   - Grant your app access to required workspaces

---

## 🏃‍♂️ Running the App

- **Development:**

  ```bash
  npm run demo
  ```

  Visit [https://localhost:9000](https://localhost:9000)

- **Production Build:**
  ```bash
  npm run build
  ```

---

## 🖥️ Usage

- **Embed a Report:**  
  Use the UI to select and view Power BI reports.
- **Performance Dashboard:**  
  Click the 📊 button to view real-time metrics.
- **Error Recovery:**  
  If authentication fails, follow the guided recovery modal.
- **Testing:**  
  Use the test button to simulate errors and export metrics.

---

## 🔧 Project Structure

```
src/
├── components/         # Embedding and error handling
├── config/             # Azure AD config
├── hooks/              # Power BI hooks
├── pages/              # Main pages
├── services/           # Power BI service logic
└── utils/              # Helpers
```

---

## 📝 Environment File Security

- Never commit `.env.local` to version control
- Use secure storage for production secrets

---

## 🔍 Troubleshooting

- **Zero Metrics:** Ensure a report is loaded and auto-refresh is enabled
- **Auth Errors:** Check Azure AD config and permissions
- **Panel Not Showing:** Clear browser cache and check localStorage

---

## 📄 License

MIT License – see LICENSE file.

---

## 🤝 Contributing

Contributions welcome! Open an issue or pull request.

---

## 📚 Resources

- [Power BI Embedded Analytics](https://docs.microsoft.com/en-us/power-bi/developer/embedded/)
- [Power BI JavaScript API](https://docs.microsoft.com/en-us/javascript/api/overview/powerbi/)
- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Power BI Community](https://community.powerbi.com/)
- [GitHub Issues](https://github.com/Microsoft/powerbi-client-react/issues)
