import { useEffect, useRef, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import "@fortawesome/fontawesome-free/css/all.min.css";
import heroVideo from "./assets/video.mp4";

import "./App.css";
const API_URL = import.meta.env.VITE_API_URL;
const fetchUserHistory = async (token) => {
  const response = await fetch(`http://${API_URL}/history`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const historyError = new Error(
      data.error || "Failed to fetch history."
    );
    historyError.status = response.status;
    throw historyError;
  }

  return data.history || [];
};

function App() {
 const { login } = useLogin({
  onComplete: ({ user: loggedInUser, loginMethod }) => {
    console.log("Privy login successful:", loggedInUser);
    console.log("Login method:", loginMethod);

    // Use the Privy user in the PlantScan UI
    if (loggedInUser) {
      setUser({
        name:
          loggedInUser.google?.name ||
          loggedInUser.email?.address ||
          "PlantScan User",
        email: loggedInUser.email?.address || "",
      });
    }

    setShowAuth(false);
    setError("");
  },

  onError: (error) => {
    console.error("Privy login failed:", error);
    setError("Google login failed. Please try again.");
  },
});

const {
  ready,
  authenticated,
  user: privyUser,
  logout: privyLogout,
} = usePrivy();



  
  const imageInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisImage, setAnalysisImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHistoryPage, setShowHistoryPage] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem("plantScanToken");
      const storedUser = localStorage.getItem("plantScanUser");

      return token && storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [history, setHistory] = useState(() => {
    return [];
  });

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);

    const section = document.getElementById(id);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleGoogleLogin = async () => {
  if (!ready) {
    console.log("Privy is still loading...");
    return;
  }

  if (authenticated && privyUser) {
    console.log("Privy user is already authenticated.");

    setUser({
      name:
        privyUser.google?.name ||
        privyUser.email?.address ||
        "PlantScan User",
      email: privyUser.email?.address || "",
    });

    setShowAuth(false);
    setError("");

    return;
  }

  try {
    await login();
  } catch (error) {
    console.error("Google login failed:", error);
    setError("Google login failed. Please try again.");
  }
};

  
useEffect(() => {
  const revealElements = document.querySelectorAll(
  `
  .how-section .section-heading,
  .how-section .step,
  .features-section h2,
  .features-section .feature,
  .identify-heading,
  .upload-area,
  .analysis-card,
  .history-modern-card
  `
);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        }
      });
    },
    {
      threshold: 0.15,
    }
  );

  revealElements.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}, []);

useEffect(() => {
  const token = localStorage.getItem("plantScanToken");

  if (!token) {
    return;
  }

  fetchUserHistory(token)
    .then((userHistory) => {
      setHistory(userHistory);
    })
    .catch((historyError) => {
      console.error("History load error:", historyError);

      if (historyError.status === 401) {
        localStorage.removeItem("plantScanToken");
        localStorage.removeItem("plantScanUser");
        setUser(null);
      }

      setHistory([]);
    });
}, []);
useEffect(() => {
  const openHistoryPage = () => {
    setShowHistoryPage(true);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  

  const closeHistoryPage = () => {
    setShowHistoryPage(false);
  };

  window.addEventListener("history-page", openHistoryPage);
  window.addEventListener("home-page", closeHistoryPage);

  return () => {
    window.removeEventListener("history-page", openHistoryPage);
    window.removeEventListener("home-page", closeHistoryPage);
  };
}, []);

const handleAuth = async (formData) => {
  try {
    setError("");
    setAuthLoading(true);

    const endpoint =
      authMode === "login"
        ? `http://${API_URL}/auth/login`
        : `http://${API_URL}/auth/signup`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Authentication failed."
      );
    }

    localStorage.setItem(
      "plantScanToken",
      data.token
    );

    localStorage.setItem(
      "plantScanUser",
      JSON.stringify(data.user)
    );

    try {
      const userHistory = await fetchUserHistory(data.token);
      setHistory(userHistory);
    } catch (historyError) {
      console.error("History load after authentication failed:", historyError);
      setHistory([]);
    }

    setUser(data.user);
    setShowAuth(false);
    setError("");
  } catch (err) {
    console.error("Authentication error:", err);
    setError(err.message || "Authentication failed.");
  } finally {
    setAuthLoading(false);
  }
};

const handleLogout = async () => {
  try {
    if (authenticated) {
      await privyLogout();
    }
  } catch (logoutError) {
    console.error("Privy logout error:", logoutError);
  }

  localStorage.removeItem("plantScanToken");
  localStorage.removeItem("plantScanUser");

  setUser(null);
  setHistory([]);
  setAnalysisResult(null);
  setAnalysisImage("");
  setShowAuth(false);
  setError("");
};

const deleteHistoryItem = async (historyId) => {
  try {
    const token = localStorage.getItem("plantScanToken");
    const response = await fetch(
      `http://${API_URL}/history/${historyId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to delete history item.");
    }

    setHistory((previousHistory) =>
      previousHistory.filter((item) => item._id !== historyId)
    );

    if (analysisResult?._id === historyId) {
      setAnalysisResult(null);
      setAnalysisImage("");
    }
  } catch (historyError) {
    console.error("History delete error:", historyError);
    setError(historyError.message || "Failed to delete history item.");
  }
};

  const handleImageUpload = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    setSelectedFile(file);
    setError("");

    const reader = new FileReader();

    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];

    if (file) {
      handleImageUpload(file);
    }
  };

  const analyzePlant = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      console.log("Sending image to backend...");

      const token = localStorage.getItem("plantScanToken");

const response = await fetch(
  `http://${API_URL}/analyze`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }
);

      console.log("Server status:", response.status);

      const data = await response.json();

      console.log("Backend response:", data);

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to analyze plant."
        );
      }

      if (!data.success) {
        throw new Error(
          data.error || "Plant analysis failed."
        );
      }

      if (!data.results) {
        throw new Error(
          "No analysis result received from server."
        );
      }
if (!data.results) {
  throw new Error(
    "No analysis result received from server."
  );
}

console.log("Setting analysis result on frontend...");

setAnalysisResult(data.results);
setAnalysisImage(data.image || imagePreview);

if (token) {
  try {
    const userHistory = await fetchUserHistory(token);
    setHistory(userHistory);
  } catch (historyError) {
    console.error(
      "History refresh after analysis failed:",
      historyError
    );
  }
}

setTimeout(() => {
  document
    .getElementById("result")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
}, 100);
    

      setTimeout(() => {
        document
          .getElementById("result")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);

    } catch (err) {
      console.error("Frontend error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // analyze again function 
  const analyzeAgain = () => {
  setSelectedFile(null);
  setImagePreview("");
  setAnalysisResult(null);
  setAnalysisImage("");
  setError("");
  setLoading(false);

  if (imageInputRef.current) {
    imageInputRef.current.value = "";
  }

  setTimeout(() => {
    document
      .getElementById("identify")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, 100);
};

  const downloadPDF = async () => {
    if (!analysisResult) {
      alert("No analysis available.");
      return;
    }

    try {
      const response = await fetch(
        `http://${API_URL}/download`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            result: analysisResult,
            image: analysisImage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate PDF.");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "Plant_Analysis_Report.pdf";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("PDF error:", err);
      alert("Failed to generate PDF.");
    }
  };

  return (
  <div className="app">

    {showAuth && (
      <AuthModal
  mode={authMode}
  setMode={setAuthMode}
  onClose={() => {
    setShowAuth(false);
    setError("");
  }}
  onSubmit={handleAuth}
  error={error}
  loading={authLoading}
  onGoogleLogin={handleGoogleLogin}
/>
    )}

    {/* =========================
        NAVBAR
    ========================= */}
   <nav className="navbar">
  <div className="navbar-brand">
    <span>🌿</span>
    <span>PlantScan</span>
  </div>

  <button
    type="button"
    className="menu-toggle"
    onClick={() => setMobileMenuOpen((previous) => !previous)}
    aria-label="Toggle navigation menu"
  >
    <i className="fas fa-bars"></i>
  </button>

  <div className={`navbar-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
    <a
      href="#home"
      onClick={(event) => {
        event.preventDefault();
        scrollToSection("home");
      }}
    >
      Home
    </a>

    <a
      href="#identify"
      onClick={(event) => {
        event.preventDefault();
        scrollToSection("identify");
      }}
    >
      Identify
    </a>

    <a
      href="#features"
      onClick={(event) => {
        event.preventDefault();
        scrollToSection("features");
      }}
    >
      Features
    </a>

   <button
  type="button"
  className="nav-history-button"
 onClick={() => {
  setMobileMenuOpen(false);

  if (!user) {
    setAuthMode("login");
    setShowAuth(true);
    setError("Please login to view your plant history.");
    return;
  }

  window.history.pushState({}, "", "#history");
  window.dispatchEvent(new Event("history-page"));
}}
>
  History
</button>
    {user ? (
      <div className="user-menu">
        <span className="user-name">Hi, {user.name}</span>

        <button
          className="login-button"
          onClick={() => {
            handleLogout();
            setMobileMenuOpen(false);
          }}
        >
          Logout
        </button>
      </div>
    ) : (
      <button
        type="button"
        className="login-button"
        onClick={() => {
          setAuthMode("login");
          setShowAuth(true);
          setError("");
          setMobileMenuOpen(false);
        }}
      >
        Login
      </button>
    )}
  </div>
</nav>
{showHistoryPage ? (
  <HistoryPage
  history={history}
  deleteHistoryItem={deleteHistoryItem}
  setAnalysisResult={setAnalysisResult}
  setAnalysisImage={setAnalysisImage}
  setShowHistoryPage={setShowHistoryPage}
    onBack={() => {
      window.history.pushState({}, "", "#home");
      window.dispatchEvent(new Event("home-page"));
    }}
  />
) : (
  <>

    {/* =========================
        HERO
    ========================= */}
    <section className="hero" id="home">

      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          src="/src/assets/video.mp4"
          type="video/mp4"
        />
      </video>

      <div className="hero-overlay"></div>

      <div className="hero-content">

        <p className="hero-label">
          AI POWERED PLANT IDENTIFICATION
        </p>

        <h1>
          Discover the
          <span> plants around you.</span>
        </h1>

        <p>
          Identify plants, understand their health,
          and learn how to care for them with AI.
        </p>

        <a
          href="#identify"
          className="hero-button"
        >
          Identify Your Plant
          <i className="fas fa-arrow-down"></i>
        </a>

      </div>

    </section>


    {/* =========================
        HOW IT WORKS
    ========================= */}
    <section
      className="how-section"
      id="how-it-works"
    >

      <div className="section-heading">

        <p className="section-label">
          HOW IT WORKS
        </p>

        <h2>
          From a photo to
          <span> plant knowledge.</span>
        </h2>

        <p>
          PlantScan uses AI to turn a simple plant
          photograph into useful information about
          its identity, health, and care.
        </p>

      </div>


      <div className="steps">

        <div className="step">

          <div className="step-number">
            01
          </div>

          <div className="step-icon">
            <i className="fas fa-camera"></i>
          </div>

          <div className="step-content">

            <h3>Capture</h3>

            <p>
              Take a clear photograph of a leaf,
              flower, or the entire plant.
            </p>

          </div>

        </div>


        <div className="step">

          <div className="step-number">
            02
          </div>

          <div className="step-icon">
            <i className="fas fa-wand-magic-sparkles"></i>
          </div>

          <div className="step-content">

            <h3>Analyze</h3>

            <p>
              Our AI examines the image and
              identifies important plant characteristics.
            </p>

          </div>

        </div>


        <div className="step">

          <div className="step-number">
            03
          </div>

          <div className="step-icon">
            <i className="fas fa-seedling"></i>
          </div>

          <div className="step-content">

            <h3>Discover</h3>

            <p>
              Get the plant's identity, health
              information, and personalized care guidance.
            </p>

          </div>

        </div>

      </div>

    </section>


    {/* =========================
        IDENTIFY PLANT
    ========================= */}
    <section
      className="identify-section"
      id="identify"
    >

      <div className="identify-content">

        <div className="identify-heading">

          <p className="section-label">
            IDENTIFY YOUR PLANT
          </p>

          <h2>
            One photo.
            <span> Endless discoveries.</span>
          </h2>

          <p>
            Upload a photo of your plant and let
            PlantScan identify its species, health,
            and care needs.
          </p>

        </div>


        {/* Upload form */}
        <form onSubmit={analyzePlant}>

          <div
            className="upload-area"

            onClick={() =>
              imageInputRef.current.click()
            }

            onDragOver={(e) =>
              e.preventDefault()
            }

            onDrop={handleDrop}
          >

            <i className="fas fa-cloud-upload-alt upload-icon"></i>

            <p className="upload-text">
              Drag & Drop or Click to Upload Plant Image
            </p>

            <p className="upload-subtext">
              JPG, PNG or JPEG
            </p>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />

            {imagePreview && (
              <img
                src={imagePreview}
                className="image-preview"
                alt="Plant preview"
              />
            )}

          </div>


          <button
            type="submit"
            className="analyze-button"
            disabled={loading}
          >

            <i className="fas fa-search"></i>

            {loading
              ? " Analyzing..."
              : " Analyze Plant"}

          </button>

        </form>


        {/* Loading */}
        {loading && (
          <div className="loading">

            <i className="fas fa-spinner fa-spin"></i>

            <p>
              Analyzing plant image...
            </p>

          </div>
        )}


        {/* Error */}
        {error && (
          <div className="error">

            <h3>❌ Analysis Error</h3>

            <p>{error}</p>

          </div>
        )}


        {/* Analysis Result */}
        {analysisResult && (
          <AnalysisResult
            result={analysisResult}
          />
        )}


        {/* Download PDF */}
        {analysisResult && (
          <button
            className="download-button"
            onClick={downloadPDF}
          >

            <i className="fas fa-file-pdf"></i>

            Download PDF Report

          </button>
        )}
        {analysisResult && (
  <button
    className="analyze-again-button"
    onClick={analyzeAgain}
  >
    <i className="fas fa-rotate"></i>
    Analyze Another Plant
  </button>
)}

      </div>

    </section>


    {/* =========================
        FEATURES
    ========================= */}
    <section
      className="features-section"
      id="features"
    >

      <p className="section-label">
        WHY PLANTSCAN
      </p>

      <h2>
        Everything you need to
        <span> understand your plant.</span>
      </h2>


      <div className="features">

        <div className="feature">

          <i className="fas fa-seedling feature-icon"></i>

          <div>
            <h3>Plant Identification</h3>

            <p>
              Identify plant species using AI-powered
              image analysis.
            </p>
          </div>

        </div>


        <div className="feature">

          <i className="fas fa-heartbeat feature-icon"></i>

          <div>
            <h3>Health Assessment</h3>

            <p>
              Understand visible symptoms and
              possible plant health problems.
            </p>
          </div>

        </div>


        <div className="feature">

          <i className="fas fa-droplet feature-icon"></i>

          <div>
            <h3>Care Recommendations</h3>

            <p>
              Get useful guidance for watering,
              sunlight, soil and fertilizer.
            </p>
          </div>

        </div>


        <div className="feature">

          <i className="fas fa-file-pdf feature-icon"></i>

          <div>
            <h3>PDF Reports</h3>

            <p>
              Download your complete plant analysis
              as a detailed report.
            </p>
          </div>

        </div>

      </div>

    </section>


    {/* =========================
        FOOTER
        We'll polish this at the end.
    ========================= */}
    <footer className="footer">

      <div className="footer-brand">
        🌿 PlantScan
      </div>

      <p>
        AI-powered plant identification and care.
      </p>

      <div className="footer-bottom">
        © 2026 PlantScan. Built with AI & 🌱
      </div>

    </footer>

  </>
)}

    </div>
  );
}

function AuthModal({
  mode,
  setMode,
  onClose,
  onSubmit,
  error,
  loading,
  onGoogleLogin,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await onSubmit({
      ...(mode === "signup" && {
        name: form.name,
      }),
      email: form.email,
      password: form.password,
    });
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          className="auth-close"
          onClick={onClose}
        >
          ×
        </button>

        {/* Logo */}
        <div className="auth-logo">
          🌿
        </div>

        {/* Heading */}
        <div className="auth-header">
          <h2>
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h2>

          <p>
            {mode === "login"
              ? "Sign in to continue to PlantScan"
              : "Join PlantScan and save your plant analyses"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {mode === "signup" && (
            <div className="auth-field">
              <label>Name</label>

              <input
                type="text"
                name="name"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email address</label>

            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-field">
            <div className="password-label">
              <label>Password</label>

              {mode === "login" && (
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    alert("Password reset feature coming soon.")
                  }
                >
                  Forgot password?
                </button>
              )}
            </div>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {/* Main button */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>OR</span>
        </div>

        {/* Google */}
       <button
  type="button"
  className="google-button"
  onClick={onGoogleLogin}
>
  <span className="google-icon">G</span>
  Continue with Google
</button>
        {/* Switch login/signup */}
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
              >
                Login
              </button>
            </>
          )}
        </div>

        <div className="auth-security">
          🔒 Your data is securely protected
        </div>
      </div>
    </div>
  );
}

/* Analysis Result */

function AnalysisResult({ result }) {

  const createList = (items) => {

    if (!Array.isArray(items) || items.length === 0) {
      return <p>No information available.</p>;
    }

    return (
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            {item}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div id="result" className="analysis-card">

      <h2>🌱 Plant Analysis</h2>

      <div className="plant-header">

        <h3>
          {result.plantName || "Unknown Plant"}
        </h3>

        <p>
          <i>
            {result.scientificName ||
              "Scientific name unavailable"}
          </i>
        </p>

      </div>

      <div className="confidence">

        <strong>
          Identification Confidence:
        </strong>

        <span>
          {result.confidence ?? 0}%
        </span>

      </div>

      <section className="analysis-section">

        <h3>📋 Description</h3>

        <p>
          {result.description ||
            "No description available."}
        </p>

      </section>

      <section className="analysis-section">

        <h3>❤️ Health Status</h3>

        <p>
          {result.healthStatus ||
            "No health assessment available."}
        </p>

      </section>

      <section className="analysis-section">

        <h3>🩺 Visible Symptoms</h3>

        {createList(result.visibleSymptoms)}

      </section>

      <div className="care-grid">

        <CareCard
          icon="💧"
          title="Watering"
          value={result.watering}
        />

        <CareCard
          icon="☀️"
          title="Sunlight"
          value={result.sunlight}
        />

        <CareCard
          icon="🌿"
          title="Soil"
          value={result.soil}
        />

        <CareCard
          icon="🌡️"
          title="Temperature"
          value={result.temperature}
        />

        <CareCard
          icon="🧪"
          title="Fertilizer"
          value={result.fertilizer}
        />

      </div>

      <section className="analysis-section">

        <h3>⚠️ Common Problems</h3>

        {createList(result.commonProblems)}

      </section>

      <section className="analysis-section">

        <h3>✅ Recommendations</h3>

        {createList(result.recommendations)}

      </section>

      <section className="analysis-section">

        <h3>💡 Interesting Facts</h3>

        {createList(result.interestingFacts)}

      </section>

    </div>
  );
}


/* Care Card */

function CareCard({ icon, title, value }) {

  return (
    <div className="care-item">

      <h3>
        {icon} {title}
      </h3>

      <p>
        {value || "Not available"}
      </p>

    </div>
  );
}

export default App;

//history page component
function HistoryPage({
  history,
  deleteHistoryItem,
  setAnalysisResult,
  setAnalysisImage,
  setShowHistoryPage,
  onBack,
}) {
  return (
    <main className="history-page">

      <div className="history-page-header">

        <button
          type="button"
          className="history-back-button"
          onClick={onBack}
        >
          <i className="fas fa-arrow-left"></i>
          Back to PlantScan
        </button>

        <div className="history-page-title">
          <p className="section-label">
            YOUR PLANT JOURNEY
          </p>

          <h1>
            Your <span>Plant History</span>
          </h1>

          <p>
            Revisit every plant you've explored
            with PlantScan.
          </p>
        </div>

      </div>

      {history.length === 0 ? (
        <div className="history-empty-card">

          <div className="history-empty-icon">
            <i className="fas fa-seedling"></i>
          </div>

          <h2>No plant analyses yet</h2>

          <p>
            Once you analyze a plant, your
            analysis will appear here.
          </p>

          <button
            type="button"
            className="history-analyze-button"
            onClick={onBack}
          >
            <i className="fas fa-camera"></i>
            Analyze Your First Plant
          </button>

        </div>
      ) : (
        <div className="history-page-grid">

          {history.map((item, index) => (
            <article
              className="history-modern-card"
              key={item._id}
              style={{
                animationDelay: `${index * 0.08}s`,
              }}
            >

              <div className="history-card-top">
                <div className="history-plant-icon">
                  <i className="fas fa-leaf"></i>
                </div>

                <p className="history-date">
                  {new Date(item.createdAt).toLocaleString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>

              <div className="history-card-main">

                <h2>
                  {item.plantName || "Unknown Plant"}
                </h2>

                <p className="history-scientific">
                  <i>
                    {item.scientificName ||
                      "Scientific name unavailable"}
                  </i>
                </p>

                <div className="history-confidence">
                  <i className="fas fa-circle-check"></i>

                  <span>
                    Identification confidence
                  </span>

                  <strong>
                    {item.confidence ?? 0}%
                  </strong>
                </div>

              </div>

              <div className="history-card-footer">

                <button
                  type="button"
                  className="history-view-button"
                  onClick={() => {
                    setAnalysisResult(item);
                    setAnalysisImage("");

                    setShowHistoryPage(false);

                    window.history.pushState(
                      {},
                      "",
                      "#identify"
                    );

                    setTimeout(() => {
                      document
                        .getElementById("result")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }, 150);
                  }}
                >
                  View Analysis
                  <i className="fas fa-arrow-right"></i>
                </button>

                <button
                  type="button"
                  className="history-delete-button"
                  onClick={() =>
                    deleteHistoryItem(item._id)
                  }
                >
                  <i className="fas fa-trash"></i>
                </button>

              </div>

            </article>
          ))}

        </div>
      )}

    </main>
  );
}