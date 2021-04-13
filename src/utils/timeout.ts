class Timeout {
  delaySeconds: number;
  timeout?: NodeJS.Timeout;
  callback: () => void;

  constructor(delaySeconds: number, callback: () => void) {
    this.delaySeconds = delaySeconds;
    this.callback = callback;
    this.reschedule();
  }

  reschedule(): void {
    this.cancel();
    this.timeout = setTimeout(this.callback, this.delaySeconds * 1000);
  }

  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

export default Timeout;
