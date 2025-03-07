import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

/**
 * Controller for health checks
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * Constructor for HealthController
   * @param health Health check service
   * @param disk Disk health indicator
   * @param memory Memory health indicator
   */
  constructor(
    private readonly health: HealthCheckService,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  /**
   * Get health status of the API
   * @returns Health check result
   */
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'API is unhealthy',
  })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Check disk storage
      () =>
        this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
      // Check memory heap
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      // Check memory RSS
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
    ]);
  }
}
