import { sleep } from './misc'
import { getLogger, logError } from './log'

const log = getLogger('scheduled-task')

/**
 * Base class for all scheduled tasks that execute at some frequency.
 */
export abstract class ScheduledTask {
  private running: boolean

  protected constructor(private readonly periodMilliseconds: number) {
    if (periodMilliseconds < 0) {
      throw Error(
        `periodMilliseconds must be >= 0. Received ${periodMilliseconds}`
      )
    }
    this.running = false
  }

  /**
   * Starts the scheduled task to execute immediately and every periodMilliseconds.
   */
  public start(): void {
    if (!this.running) {
      // Purposefully don't await
      this.running = true
      this.run()
    }
  }

  /**
   * Stops the scheduled task. If it is in the middle of a scheduled run, it will complete
   */
  public stop(): void {
    this.running = false
  }

  public async run(): Promise<void> {
    while (this.running) {
      let rerunImmediately: boolean
      try {
        rerunImmediately = await this.runTask()
      } catch (e) {
        logError(
          log,
          `ScheduledTask caught error on execution. Re-throwing so initial caller of run() may handle it appropriately.`,
          e
        )
        this.running = false
        throw e
      }

      if (rerunImmediately) {
        // Purposefully do not await
        this.run()
        return
      }

      try {
        await sleep(this.periodMilliseconds)
      } catch (e) {
        logError(
          log,
          `Error sleeping in ScheduledTask! Continuing execution.`,
          e
        )
      }
    }
  }

  /**
   * Task to be called every `periodMilliseconds` when `running` is true.
   *
   * Note: Exceptions must be handled in this function or else subsequent runs will not occur.
   * @returns True if the task should be re-run immediately, false if it should be re-run after the configured delay.
   */
  public abstract async runTask(): Promise<boolean>
}
