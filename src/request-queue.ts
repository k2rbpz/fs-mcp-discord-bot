/**
 * Manages a queue of tasks on a per-channel basis to prevent race conditions
 * when interacting with shared resources like agent memory.
 */
export class RequestQueue {
  // A map where the key is the channel ID and the value is the promise
  // of the last task added to that channel's queue.
  private queues: Map<string, Promise<void>> = new Map();

  /**
   * Adds a task to a specific channel's queue. The task will only execute
   * after all previous tasks for that channel have completed.
   * @param channelId The ID of the channel to queue the request for.
   * @param task A function that returns a promise representing the work to be done.
   * @returns A promise that resolves when the enqueued task is complete.
   */
  public addToQueue(channelId: string, task: () => Promise<void>): Promise<void> {
    // Get the promise of the last task in the queue for this channel.
    // If no task exists, start with an already-resolved promise.
    const lastTask = this.queues.get(channelId) || Promise.resolve();

    // Create a new promise that waits for the last task to finish, then executes the new task.
    const currentTask = lastTask.then(task);

    // Store the new promise as the last task for this channel.
    this.queues.set(channelId, currentTask);

    // After the task is done, if no other task has been added for this channel
    // in the meantime, clean up the queue to prevent memory leaks from inactive channels.
    currentTask.finally(() => {
      if (this.queues.get(channelId) === currentTask) {
        this.queues.delete(channelId);
      }
    });

    return currentTask;
  }
}