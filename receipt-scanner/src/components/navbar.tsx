"use client"

import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/auth-context"
import { User, LogOut, Menu, Receipt, Home, CreditCard, Scan } from "lucide-react"
import { BarChart } from "lucide-react";

export default function Navbar() {
  const location = useLocation()
  const { isAuthenticated, logout } = useAuth()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
      <div className="container">
        <Link to={isAuthenticated ? "/app" : "/"} className="navbar-brand d-flex align-items-center">
          <Receipt className="me-2" />
          <span className="fw-bold">SmartSlip</span>
        </Link>

        {/* Mobile Menu Button - Shows on mobile, parallel to logo */}
        <div className="dropdown d-lg-none">
          <button
            className="btn btn-link text-dark p-1"
            type="button"
            id="mobileMenuDropdown"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <Menu />
          </button>
          <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="mobileMenuDropdown">
            {!isAuthenticated && (
              <li>
                <Link to="/" className="dropdown-item">
                  Home
                </Link>
              </li>
            )}
            {isAuthenticated && (
              <>
                <li>
                  <Link to="/app" className="dropdown-item">
                    Scanner
                  </Link>
                </li>
                <li>
                  <Link to="/history" className="dropdown-item">
                    History
                  </Link>
                </li>
                <li>
                  <Link to="/spending-analysis" className="dropdown-item">
                    Spending Analysis
                  </Link>
                </li>
              </>
            )}
            <li>
              <Link to="/pricing" className="dropdown-item">
                Pricing
              </Link>
            </li>
            <li><hr className="dropdown-divider" /></li>
            {!isAuthenticated ? (
              <>
                <li>
                  <Link to="/login" className="dropdown-item">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="dropdown-item">
                    Sign up
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/profile" className="dropdown-item d-flex align-items-center">
                    <User size={16} className="me-2" />
                    My Profile
                  </Link>
                </li>
                <li>
                  <button onClick={logout} className="dropdown-item text-danger d-flex align-items-center">
                    <LogOut size={16} className="me-2" />
                    <span>Log out</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>

        <button
          className="navbar-toggler d-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto d-none d-lg-flex">
            {!isAuthenticated && (
              <li className="nav-item">
                <Link
                  to="/"
                  className={`nav-link ${isActive("/") ? "active" : ""}`}
                >
                  <div className="d-flex align-items-center">
                    <Home size={16} className="me-1" />
                    <span>Home</span>
                  </div>
                </Link>
              </li>
            )}
            {isAuthenticated && (
              <li className="nav-item">
                <Link
                  to="/app"
                  className={`nav-link ${isActive("/app") ? "active" : ""}`}
                >
                  <div className="d-flex align-items-center">
                    <Scan size={16} className="me-1" />
                    <span>Scanner</span>
                  </div>
                </Link>
              </li>
            )}
            {isAuthenticated && (
              <li className="nav-item">
                <Link
                  to="/history"
                  className={`nav-link ${isActive("/history") ? "active" : ""}`}
                >
                  <div className="d-flex align-items-center">
                    <Receipt size={16} className="me-1" />
                    <span>History</span>
                  </div>
                </Link>
              </li>
            )}
            {isAuthenticated && (
              <li className="nav-item">
                <Link
                  to="/spending-analysis"
                  className={`nav-link ${isActive("/spending-analysis") ? "active" : ""}`}
                >
                  <div className="d-flex align-items-center">
                    <BarChart size={16} className="me-1" />
                    <span>Spending Analysis</span>
                  </div>
                </Link>
              </li>
            )}
            <li className="nav-item">
              <Link
                to="/pricing"
                className={`nav-link ${isActive("/pricing") ? "active" : ""}`}
              >
                <div className="d-flex align-items-center">
                  <CreditCard size={16} className="me-1" />
                  <span>Pricing</span>
                </div>
              </Link>
            </li>
          </ul>
          
          <div className="d-flex align-items-center gap-3">
            {isAuthenticated ? (
              <div className="dropdown d-none d-lg-block">
                <button
                  className="btn btn-link text-dark p-1 dropdown-toggle"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <User className="rounded-circle" />
                </button>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                  <li>
                    <Link to="/profile" className="dropdown-item d-flex align-items-center">
                      <User size={16} className="me-2" />
                      My Profile
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <Link to="/history" className="dropdown-item">
                      My Receipts
                    </Link>
                  </li>
                  <li>
                  <Link to="/spending-analysis" className="dropdown-item">
                          Spending Analysis
                  </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button onClick={logout} className="dropdown-item text-danger d-flex align-items-center">
                      <LogOut size={16} className="me-2" />
                      <span>Log out</span>
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-none d-lg-flex gap-2">
                <Link to="/login" className="btn btn-outline-primary">
                  Log in
                </Link>
                <Link to="/signup" className="btn btn-primary">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}