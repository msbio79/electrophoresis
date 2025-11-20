class ElectrophoresisSimulation {
    constructor() {
        // DOM Elements
        this.voltageDisplay = document.getElementById('voltage-display');
        this.timerDisplay = document.getElementById('timer-display');
        this.voltageSlider = document.getElementById('voltage-slider');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.gelBox = document.getElementById('gel-box');
        this.bandsContainer = document.getElementById('bands-container');

        // State
        this.isRunning = false;
        this.isPaused = false;
        this.timeElapsed = 0; // in seconds
        this.voltage = 100;
        this.timerInterval = null;
        this.animationFrame = null;
        this.samplesLoaded = false;

        // Physics Constants
        this.baseSpeed = 0.5; // pixels per tick at 100V for smallest fragment
        this.gelLength = 400; // px (approx height of gel box)

        // DNA Samples (Size in base pairs - bp)
        // Smaller bp moves faster. Speed is inversely proportional to log(size) roughly
        this.samples = [];

        this.init();
    }

    init() {
        // Event Listeners
        this.voltageSlider.addEventListener('input', (e) => this.updateVoltage(e.target.value));
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.loadSampleBtn.addEventListener('click', () => this.loadSamples());

        // Initial Display
        this.updateVoltage(100);
    }

    updateVoltage(val) {
        this.voltage = parseInt(val);
        this.voltageDisplay.textContent = this.voltage;
    }

    loadSamples() {
        if (this.isRunning) return;

        this.reset(); // Clear existing
        this.samplesLoaded = true;
        this.loadSampleBtn.textContent = "샘플 로드 완료!";
        this.loadSampleBtn.disabled = true;

        // Define some mock DNA ladders/samples
        // Well 1: Ladder (Standard markers)
        // Well 2: Sample A
        // Well 3: Sample B

        const ladder = [100, 200, 500, 1000, 2000]; // bp
        const sampleA = [300, 800];
        const sampleB = [150, 1200, 1800];
        const sampleC = [500]; // Control

        this.createBands(1, ladder);
        this.createBands(2, sampleA);
        this.createBands(3, sampleB);
        this.createBands(4, sampleC);
    }

    createBands(wellIndex, sizes) {
        const wellWidth = this.gelBox.offsetWidth / 5; // 5 wells
        const startX = (wellIndex - 1) * wellWidth + (wellWidth / 2) - 15; // Center in well (30px width band)

        sizes.forEach(size => {
            const band = document.createElement('div');
            band.className = 'dna-band';
            band.style.left = `${startX}px`;
            band.style.top = '15px'; // Start just below the well
            band.dataset.size = size;
            band.dataset.y = 15; // Internal float position

            // Tooltip or visual indicator of size could be added here
            band.title = `${size} bp`;

            // Add label for Lane 1 (Marker)
            if (wellIndex === 1) {
                const label = document.createElement('span');
                label.className = 'dna-band-label';
                label.textContent = `${size}`;
                band.appendChild(label);
            }

            this.bandsContainer.appendChild(band);
            this.samples.push({
                element: band,
                size: size,
                y: 15,
                finished: false
            });
        });
    }

    start() {
        if (!this.samplesLoaded) {
            alert("먼저 DNA 샘플을 로드해주세요!");
            return;
        }
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.loadSampleBtn.disabled = true;
        this.voltageSlider.disabled = true; // Lock voltage during run for simplicity

        this.lastTime = performance.now();
        this.runLoop();
        this.startTimer();
    }

    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        this.isPaused = true;
        this.startBtn.disabled = false;
        this.startBtn.textContent = "계속";
        this.pauseBtn.disabled = true;
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.animationFrame);
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.timeElapsed = 0;
        this.timerDisplay.textContent = "00:00";
        this.startBtn.disabled = false;
        this.startBtn.textContent = "시작";
        this.pauseBtn.disabled = true;
        this.loadSampleBtn.disabled = false;
        this.loadSampleBtn.textContent = "DNA 샘플 로드";
        this.voltageSlider.disabled = false;

        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.animationFrame);

        // Clear bands
        this.bandsContainer.innerHTML = '';
        this.samples = [];
        this.samplesLoaded = false;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeElapsed++;
            const mins = Math.floor(this.timeElapsed / 60).toString().padStart(2, '0');
            const secs = (this.timeElapsed % 60).toString().padStart(2, '0');
            this.timerDisplay.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    runLoop() {
        if (!this.isRunning) return;

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000; // delta time in seconds
        this.lastTime = now;

        // Physics Update
        // Speed depends on Voltage and Size.
        // v ~ E * q / f
        // For DNA in agarose: Mobility u ~ 1 / log(MW) roughly, or 1/size^k
        // Simplified: Speed = (Voltage / 100) * (BaseSpeed / Math.log10(Size)) * ScaleFactor

        const voltageFactor = this.voltage / 100;

        this.samples.forEach(sample => {
            if (sample.finished) return;

            // Smaller moves faster. 
            // 100bp -> fast
            // 2000bp -> slow
            // Using a simplified inverse relationship for visual clarity
            const mobility = 500 / (sample.size + 200); // Tuned for visual effect
            const speed = this.baseSpeed * voltageFactor * mobility * 60; // pixels per second

            sample.y += speed * dt;

            // Boundary check
            if (sample.y >= this.gelBox.clientHeight - 10) {
                sample.y = this.gelBox.clientHeight - 10;
                sample.finished = true;
            }

            sample.element.style.top = `${sample.y}px`;
        });

        this.animationFrame = requestAnimationFrame(() => this.runLoop());
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const app = new ElectrophoresisSimulation();
});
