"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, Camera, X, Save, RefreshCw } from "lucide-react"
import { useAuth } from "../contexts/auth-context"
import { useSubscription } from "../contexts/subscription-context"
import UsageQuota from "../components/UsageQuota"
import Paywall from "../components/Paywall"

const API_BASE_URL = "http://localhost:3000";

interface ReceiptItem {
  name: string
  quantity: number
  price: number
  total: number
  category_id: number
  category_name: string
}

interface ReceiptAnalysis {
  store: {
    name: string
    location: string
    abn: string
  }
  date: string
  items: ReceiptItem[]
  totals: {
    subtotal: number
    tax: number
    total: number
  }
  payment: {
    method: string
    reference: string
  }
}

export default function HomePage() {
  const { token } = useAuth()
  const { subscription, usage, canUpload } = useSubscription()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState("")
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const showToast = (props: { title: string, description: string, variant?: string }) => {
    // Simple toast function until we have a proper implementation
    console.log(`${props.title}: ${props.description}`);
    alert(`${props.title}: ${props.description}`);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const uploadReceipt = async (fileToUpload: File) => {
    // Check if user can upload before proceeding
    if (!canUpload()) {
      setShowPaywall(true)
      return
    }

    try {
      setIsUploading(true)
      setProgress(25)
      setStatusText("Uploading receipt...")

      const formData = new FormData()
      formData.append("file", fileToUpload)

      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload receipt")
      }

      const uploadData = await uploadResponse.json()

      if (uploadData.status !== "success" || !uploadData.text) {
        throw new Error("No text extracted from image")
      }

      setProgress(50)
      setStatusText("Analyzing text...")

      const analysisResponse = await fetch(`${API_BASE_URL}/analyze-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: uploadData.text }),
      })

      if (!analysisResponse.ok) {
        throw new Error("Failed to analyze receipt")
      }

      const analysisData = await analysisResponse.json()

      if (!analysisData.success || !analysisData.data) {
        throw new Error("Analysis failed")
      }

      setProgress(100)
      setStatusText("Analysis complete!")
      setAnalysis(analysisData.data)

      showToast({
        title: "Receipt analyzed successfully",
        description: "Your receipt has been processed.",
      })
    } catch (error) {
      showToast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpload = async () => {
    if (file) {
      await uploadReceipt(file)
    }
  }

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      streamRef.current = stream
      setIsCameraActive(true)
    } catch (error) {
      showToast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
      })
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !streamRef.current) return

    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const capturedFile = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
          setFile(capturedFile)
          await uploadReceipt(capturedFile)
          stopCamera()
        }
      },
      "image/jpeg",
      0.95,
    )
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setIsCameraActive(false)
    }
  }

  const saveReceipt = async () => {
    if (!analysis || !token) return

    try {
      const response = await fetch(`${API_BASE_URL}/save-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analysis }),
      })

      const data = await response.json()

      if (data.success) {
        showToast({
          title: "Receipt saved",
          description: "Your receipt has been saved to your account.",
        })
      } else {
        throw new Error(data.message || "Failed to save receipt")
      }
    } catch (error) {
      showToast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save receipt",
      })
    }
  }

  const resetForm = () => {
    setFile(null)
    setAnalysis(null)
    setProgress(0)
    setStatusText("")
    stopCamera()
  }

  useEffect(() => {
    return () => {
      // Clean up camera on component unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h1 className="display-5 fw-bold">Receipt Scanner & Analyzer</h1>
        <p className="text-muted">Upload or capture receipts for instant analysis</p>
      </div>

      {/* Usage Quota Display */}
      <div className="mb-4 d-flex justify-content-center">
        <UsageQuota />
      </div>

      {!analysis ? (
        <>
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 mb-4">
            <button 
              className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Upload size={18} />
              <span>Upload Receipt</span>
            </button>
            <input 
              id="file-upload" 
              type="file" 
              accept="image/*,.pdf" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />

            <button
              className={`btn ${isCameraActive ? 'btn-danger' : 'btn-primary'} d-flex align-items-center justify-content-center gap-2`}
              onClick={isCameraActive ? stopCamera : initCamera}
            >
              <Camera size={18} />
              <span>{isCameraActive ? "Stop Camera" : "Take Photo"}</span>
            </button>
          </div>

          {isCameraActive ? (
            <div className="position-relative mb-4 rounded border overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-100" 
                style={{ maxHeight: '400px', objectFit: 'contain', background: '#000' }} 
              />
              <div className="position-absolute bottom-0 start-0 end-0 d-flex justify-content-center p-3">
                <button 
                  onClick={capturePhoto} 
                  className="btn btn-primary btn-lg shadow"
                >
                  <Camera size={20} className="me-2" />
                  Capture
                </button>
              </div>
            </div>
          ) : file ? (
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-medium">{file.name}</span>
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => setFile(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <button onClick={handleUpload} className="btn btn-primary w-100">
                Process Receipt
              </button>
            </div>
          ) : (
            <div className="card mb-4">
              <div className="card-body">
                <div
                  className="border border-2 border-dashed rounded p-4 text-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <div className="d-flex flex-column align-items-center">
                    <Upload size={48} className="text-muted mb-3" />
                    <h5>Drag and drop your receipt here</h5>
                    <p className="text-muted small">Supports PDF and images (JPG, PNG)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="progress">
                <div 
                  className="progress-bar" 
                  role="progressbar" 
                  style={{ width: `${progress}%` }} 
                  aria-valuenow={progress} 
                  aria-valuemin={0} 
                  aria-valuemax={100}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mb-4">
          {/* Paywall Modal */}
          {showPaywall && (
            <Paywall
              feature="Receipt Upload"
              isOpen={showPaywall}
              onClose={() => setShowPaywall(false)}
              benefits={[
                "Unlimited receipt uploads",
                "Unlimited storage history",
                "Export to PDF, CSV, and Excel",
                "Advanced spending analytics",
                "Scheduled monthly reports"
              ]}
            />
          )}
          <div className="card">
            <div className="card-body">
              <h2 className="card-title mb-4">Receipt Details</h2>
              
              <div className="row mb-4">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Store</h6>
                  <p className="fw-medium mb-1">{analysis.store.name}</p>
                  <p className="text-muted mb-1">{analysis.store.location}</p>
                  {analysis.store.abn && <p className="text-muted">ABN: {analysis.store.abn}</p>}
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Transaction</h6>
                  <p className="fw-medium mb-1">Date: {analysis.date}</p>
                  <p className="mb-1">Total: ${analysis.totals.total.toFixed(2)}</p>
                  <p className="text-muted">Payment: {analysis.payment.method}</p>
                </div>
              </div>

              <h5 className="mb-3">Items</h5>
              <div className="table-responsive mb-4">
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th className="text-end">Qty</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>
                          <span className="badge bg-primary bg-opacity-10 text-primary">
                            {item.category_name}
                          </span>
                        </td>
                        <td className="text-end">{item.quantity}</td>
                        <td className="text-end">${item.price.toFixed(2)}</td>
                        <td className="text-end">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="table-light">
                    <tr>
                      <td colSpan={4} className="text-end fw-medium">Subtotal:</td>
                      <td className="text-end">${analysis.totals.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="text-end fw-medium">Tax:</td>
                      <td className="text-end">${analysis.totals.tax.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="text-end fw-medium">Total:</td>
                      <td className="text-end fw-bold">${analysis.totals.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                {token && (
                  <button onClick={saveReceipt} className="btn btn-primary d-flex align-items-center justify-content-center gap-2">
                    <Save size={18} />
                    Save Receipt
                  </button>
                )}
                <button onClick={resetForm} className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2">
                  <RefreshCw size={18} />
                  Scan Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}