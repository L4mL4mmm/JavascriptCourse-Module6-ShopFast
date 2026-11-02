import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { TicketsService } from '../tickets/tickets.service';

describe('AiAgentController', () => {
  let controller: AiAgentController;
  let mockAiAgentService: any;
  let mockTicketsService: any;

  beforeEach(() => {
    mockAiAgentService = {
      chat: jest.fn().mockResolvedValue({ reply: 'Xin chào', toolCalls: [] }),
    };
    mockTicketsService = {
      getPendingProposals: jest.fn().mockResolvedValue([{ id: 'p1' }]),
      confirmProposal: jest.fn().mockResolvedValue({ executed: true }),
    };

    controller = new AiAgentController(
      mockAiAgentService as AiAgentService,
      mockTicketsService as TicketsService,
    );
  });

  it('should process chat request', async () => {
    const user = { userId: 'u1', role: 'CUSTOMER', email: 'a@b.com' };
    const res = await controller.chat(user, { message: 'Xin chào' });
    expect(res.reply).toBe('Xin chào');
  });

  it('should get pending proposals', async () => {
    const res = await controller.getPendingProposals();
    expect(res.length).toBe(1);
  });

  it('should confirm proposal', async () => {
    const user = { userId: 'agent-1', role: 'AGENT', email: 'agent@b.com' };
    const res = await controller.confirmProposal('p1', user, { decision: 'APPROVE' });
    expect(res.executed).toBe(true);
  });
});
