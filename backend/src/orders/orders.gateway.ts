import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyNewOrder(shopId: number | null, order: any) {
    this.logger.log(`Emitting order_created for shop ${shopId}`);
    // Notify general admins or specific shops
    if (shopId) {
      this.server.emit(`shop_${shopId}_new_order`, order);
    }
    this.server.emit('admin_new_order', order);
  }

  notifyOrderStatusUpdate(orderId: number, status: string, userId: number) {
    this.logger.log(`Emitting status_update for order ${orderId} (user ${userId})`);
    // Notify the user who placed the order
    this.server.emit(`user_${userId}_order_update`, { orderId, status });
    // Notify admins
    this.server.emit('admin_order_update', { orderId, status });
  }
}
