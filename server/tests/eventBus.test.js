const eventBus = require('../eventBus');

describe('event bus notification listeners', () => {
  beforeEach(() => {
    eventBus.clearNotificationLog();
  });

  test('issueCreated listener records a notification', () => {
    eventBus.emit('issueCreated', {
      id: 'issue-test',
      title: 'Event test',
      reporter: 'resident1'
    });

    expect(eventBus.getNotificationLog()).toEqual([
      expect.objectContaining({
        type: 'issueCreated',
        issueId: 'issue-test',
        message: expect.stringContaining('Event test')
      })
    ]);
  });
});
