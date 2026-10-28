/* global Reveal, RevealNotes, RevealHighlight */
(async function () {
  try {
    await document.fonts.ready;
    const deck = new Reveal({
      width: 1080,
      height: 607.5,
      margin: 0,
      minScale: 0.1,
      maxScale: 3,
      hash: true,
      hashOneBasedIndex: true,
      history: true,
      controls: false,
      progress: false,
      slideNumber: (slide) => [Array.from(document.querySelectorAll(".slides > section")).indexOf(slide) + 1, "/", document.querySelectorAll(".slides > section").length],
      showSlideNumber: "all",
      center: false,
      transition: "none",
      backgroundTransition: "none",
      pdfMaxPagesPerSlide: 1,
      pdfSeparateFragments: false,
      plugins: [RevealNotes, RevealHighlight],
    });
    await deck.initialize();
    window.presentation = deck;
    const controls = document.querySelector(".presenter-controls");
    document.getElementById("previous-slide").addEventListener("click", () => deck.prev());
    document.getElementById("next-slide").addEventListener("click", () => deck.next());
    document.getElementById("speaker-notes").addEventListener("click", () => {
      try {
        deck.getPlugin("notes").open();
      } catch {
        const alert = document.getElementById("presentation-error");
        alert.textContent = "Allow popups for this site, then click Speaker notes again.";
        alert.hidden = false;
      }
    });
    const toggleControls = () => { controls.hidden = !controls.hidden; };
    document.getElementById("hide-controls").addEventListener("click", toggleControls);
    deck.addKeyBinding({ keyCode: 80, key: "P", description: "Toggle presenter controls" }, toggleControls);
  } catch (error) {
    document.getElementById("presentation-error").hidden = false;
    console.error("Presentation initialization failed.", error);
  }
})();
