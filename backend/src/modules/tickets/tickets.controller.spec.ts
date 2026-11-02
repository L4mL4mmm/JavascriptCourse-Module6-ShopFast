import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

describe('TicketsController', () => {
  let controller: TicketsController;
  let mockTicketsService: any;

  beforeEach(() => {
    mockTicketsService = {
      createTicket: jest.fn().mockResolvedValue({ id: 't1' }),
      findAll: jest.fn().mockResolvedValue([{ id: 't1' }]),
      getPendingProposals: jest.fn().mockResolvedValue([{ id: 'p1' }]),
      confirmProposal: jest.fn().mockResolvedValue({ executed: true }),
      findById: jest.fn().mockResolvedValue({ id: 't1' }),
    };

    controller = new TicketsController(mockTicketsService as TicketsService);
  });

  it('should create ticket', async () => {
    const user = { userId: 'u1', role: 'CUSTOMER', email: 'a@b.com' };
    const res = await controller.createTicket(user, { title: 'T', description: 'D' });
    expect(res.id).toBe('t1');
  });

  it('should find all tickets', async () => {
    const user = { userId: 'u1', role: 'CUSTOMER', email: 'a@b.com' };
    const res = await controller.findAll(user);
    expect(res.length).toBe(1);
  });

  it('should get pending proposals', async () => {
    const res = await controller.getPendingProposals();
    expect(res.length).toBe(1);
  });

  it('should confirm proposal', async () => {
    const user = { userId: 'agent-1', role: 'AGENT', email: 'a@b.com' };
    const res = await controller.confirmProposal('p1', user, { decision: 'APPROVE' });
    expect(res.executed).toBe(true);
  });

  it('should find one ticket', async () => {
    const res = await controller.findOne('t1');
    expect(res.id).toBe('t1');
  });
});
