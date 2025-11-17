// cloud-vision-api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Configure multer for handling image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit to 5MB
  },
});

// Initialize Google Cloud Vision client
// Try to use credentials from environment variable first, then fall back to file
let visionClient;
try {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    // Production: Use credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    visionClient = new ImageAnnotatorClient({ credentials });
    console.log('✓ Google Cloud Vision initialized from environment variable');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local: Use credentials file path
    visionClient = new ImageAnnotatorClient();
    console.log('✓ Google Cloud Vision initialized from credentials file');
  } else {
    throw new Error('No Google Cloud credentials found');
  }
} catch (error) {
  console.error('⚠️ Failed to initialize Google Cloud Vision:', error.message);
  visionClient = null;
}

// Route to handle OCR with Google Cloud Vision
router.post('/cloud-vision', upload.single('image'), async (req, res) => {
  try {
    // Check if image file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Perform OCR with Google Cloud Vision
    const [result] = await visionClient.textDetection({
      image: {
        content: req.file.buffer,
      },
    });

    // Extract text annotations
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return res.status(200).json({ 
        text: 'No text detected in the image.',
        confidence: 0 
      });
    }

    // The first annotation contains the full text
    const fullText = detections[0].description;
    
    // Optional: Calculate a simple confidence score
    // (Cloud Vision doesn't provide an overall confidence score like Tesseract)
    let estimatedConfidence = 0;
    if (detections.length > 1) {
      // You could estimate confidence based on detection quality
      // This is a simplified approach
      estimatedConfidence = Math.min(95, 65 + (detections.length / 10) * 3);
    }

    return res.status(200).json({
      text: fullText,
      confidence: estimatedConfidence,
      detections: detections.length,
    });
  } catch (error) {
    console.error('Google Cloud Vision API Error:', error);
    return res.status(500).json({ 
      error: 'Error processing image with Cloud Vision',
      details: error.message
    });
  }
});

// Route to handle OCR with custom API fallback
// You might want to add another OCR service as a further fallback
router.post('/custom-ocr', upload.single('image'), async (req, res) => {
  try {
    // Implement any custom OCR logic here
    // This could be another third-party API or a custom model
    
    // For now, we'll return a placeholder error
    return res.status(501).json({
      error: 'Custom OCR service not implemented yet'
    });
  } catch (error) {
    console.error('Custom OCR Error:', error);
    return res.status(500).json({ error: 'Error in custom OCR processing' });
  }
});

module.exports = router;
module.exports.getVisionClient = () => visionClient;