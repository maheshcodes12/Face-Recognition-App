export class CustomCamera {
	constructor(videoElement, onFrameCallback) {
		this.videoElement = videoElement;
		this.onFrameCallback = onFrameCallback;
		this.running = false;
	}

	async start() {
		const stream = await navigator.mediaDevices.getUserMedia({ video: true });
		this.videoElement.srcObject = stream;

		// Play the video and start processing frames.
		await this.videoElement.play();
		this.running = true;
		this.processFrames();
	}

	async processFrames() {
		while (this.running) {
			await this.onFrameCallback();
			await new Promise((resolve) => requestAnimationFrame(resolve));
		}
	}

	stop() {
		this.running = false;
		const stream = this.videoElement.srcObject;
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
	}
}
