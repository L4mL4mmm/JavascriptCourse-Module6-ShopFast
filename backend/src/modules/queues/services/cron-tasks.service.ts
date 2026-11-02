import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Not, Repository, Between } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus, PaymentStatus } from '../../../common/enums';
import { QueueProducerService } from '../queue-producer.service';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class CronTasksService {
  private readonly logger = new Logger(CronTasksService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly queueProducer: QueueProducerService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Cron Job: Every 30 minutes - Check for unpaid orders created > 30 minutes ago
   */
  @Cron('*/30 * * * *')
  async handleUnpaidOrderReminders() {
    this.logger.log('[CRON] Running 30-minute unpaid order reminder task...');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const unpaidOrders = await this.orderRepository.find({
      where: {
        paymentStatus: PaymentStatus.UNPAID,
        status: Not(OrderStatus.CANCELLED),
        createdAt: LessThanOrEqual(thirtyMinutesAgo),
      },
      relations: ['customer'],
    });

    this.logger.log(`[CRON] Found ${unpaidOrders.length} unpaid orders pending reminder.`);

    for (const order of unpaidOrders) {
      if (order.customer?.email) {
        await this.queueProducer.addUnpaidReminderJob({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerEmail: order.customer.email,
        });
      }
    }
  }

  /**
   * Cron Job: Daily at Midnight (00:00) - Generate revenue report
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMidnightRevenueReport() {
    this.logger.log('[CRON] Generating Daily Midnight Revenue Report...');
    const now = new Date();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);

    return await this.calculateRevenueReport(yesterdayStart, yesterdayEnd);
  }

  /**
   * Calculate revenue metrics for a given date range
   */
  async calculateRevenueReport(startDate: Date, endDate: Date) {
    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PAID);
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED);

    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    const report = {
      reportDate: startDate.toISOString().split('T')[0],
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      totalOrders,
      paidOrdersCount: paidOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      totalRevenue,
      averageOrderValue,
      generatedAt: new Date().toISOString(),
    };

    this.logger.log(
      `[REVENUE REPORT] Date: ${report.reportDate} | Revenue: ${totalRevenue.toLocaleString()} VNĐ | Paid Orders: ${paidOrders.length}/${totalOrders}`,
    );

    // Save report to cache for instant dashboard access
    const reportKey = `report:revenue:${report.reportDate}`;
    await this.cacheService.set(reportKey, report, 86400 * 30); // 30 days

    return report;
  }
}
