"use client";

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const FaceTracking = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const faceTrackingIntervalRef = useRef(null);

  useEffect(() => {
    // Load models
    const loadModels = async () => {
      const MODEL_URL = "/models";

      // Load face-api.js models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      console.log("Models loaded");
      startVideo();
    };

    // Start video streaming
    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error("Error accessing webcam:", err));
    };

    loadModels();
  }, []);

  useEffect(() => {
    const detectFaces = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Set up canvas to match video dimensions
      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      // Clear previous canvas content
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect faces and draw them on the canvas during the video stream
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions()
      );

      // Resize detections to fit canvas
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Draw detections (faces) on canvas
      faceapi.draw.drawDetections(canvas, resizedDetections);
    };

    // Start face detection and drawing every 100ms during the video stream
    faceTrackingIntervalRef.current = setInterval(detectFaces, 100);

    // Cleanup interval when component unmounts
    return () => {
      clearInterval(faceTrackingIntervalRef.current);
    };
  }, []);

  const handleStartStopRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = () => {
    const videoStream = videoRef.current.srcObject;
    const canvas = canvasRef.current;

    // Set up canvas dimensions to match the video stream
    const videoTrack = videoStream.getVideoTracks()[0];
    const videoWidth = videoTrack.getSettings().width;
    const videoHeight = videoTrack.getSettings().height;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Create a stream from the canvas
    const canvasStream = canvas.captureStream(30); // Capture the canvas as a stream

    // Combine the canvas stream (with video and overlay) with the audio stream (if available)
    const audioStream = videoStream.getAudioTracks().length > 0 ? videoStream : null;

    const combinedStream = new MediaStream([
      ...canvasStream.getTracks(), // Include canvas video tracks
      ...(audioStream ? audioStream.getTracks() : []), // Include audio tracks if available
    ]);

    mediaRecorderRef.current = new MediaRecorder(combinedStream, {
      mimeType: "video/webm",
    });
    recordedChunks.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      // Save video to localStorage
      const videoId = `video-${Date.now()}`;
      localStorage.setItem(videoId, url);

      // Trigger download
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "recorded-video.webm";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="relative bg-white shadow-md rounded-lg p-4 w-full max-w-lg">
        {/* Video Element */}
        <div className="relative w-full h-64 overflow-hidden rounded-md">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        </div>

        {/* Button */}
        <div className="mt-4 text-center">
          <button
            onClick={handleStartStopRecording}
            className={`px-4 py-2 text-white font-bold rounded-lg transition-colors duration-300 ${
              isRecording ? "bg-red-500 hover:bg-red-700" : "bg-blue-500 hover:bg-blue-700"
            }`}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FaceTracking;
