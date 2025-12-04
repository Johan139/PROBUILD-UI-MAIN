(function waitForPdfJs() {
  if (typeof window.pdfjsLib === "undefined") {
    // Try again in 50ms until PDF.js is loaded
    setTimeout(waitForPdfJs, 50);
    return;
  }

  // PDF.js is finally loaded — now apply your settings
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/pdfjs/pdf.worker.mjs";
  window.pdfjsLib.disableLogs = true;
})();
