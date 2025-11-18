"use strict";

pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/pdfjs/pdf.worker.mjs";

// Disable logging - kept getting logs from the viewer anytime a PDF was loaded/changed. Basically an advert for pdf.js
pdfjsLib.disableLogs = true;
