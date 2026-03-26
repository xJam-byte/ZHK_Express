import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ─── Emit order events ────────────────────────────────────

  /** New order created → notify shop dashboard */
  emitOrderCreated(order: any) {
    this.server.emit('order:created', {
      id: order.id,
      status: order.status,
      shopId: order.shopId,
    });
    this.logger.debug(`Emitted order:created #${order.id}`);
  }

  /** Order status changed → notify shop + client tracking */
  emitOrderUpdated(order: any) {
    this.server.emit('order:updated', {
      id: order.id,
      status: order.status,
      shopId: order.shopId,
    });
    this.logger.debug(`Emitted order:updated #${order.id} → ${order.status}`);
  }

  /** Order rated → notify shop */
  emitOrderRated(order: any) {
    this.server.emit('order:rated', {
      id: order.id,
      shopId: order.shopId,
      rating: order.rating,
    });
    this.logger.debug(`Emitted order:rated #${order.id}`);
  }
}
