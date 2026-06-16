const resolvers = require('../resolvers');
const eventBus = require('../eventBus');

describe('issue resolver', () => {
  beforeEach(() => {
    resolvers.__store.resetIssues();
    eventBus.clearNotificationLog();
  });

  test('createIssue returns a new open issue for the logged-in resident', () => {
    const result = resolvers.Mutation.createIssue(
      null,
      { title: 'Broken window latch', description: 'Room 212 latch is loose.' },
      { user: 'tester', role: 'RESIDENT' }
    );

    expect(result).toMatchObject({
      title: 'Broken window latch',
      description: 'Room 212 latch is loose.',
      status: 'OPEN',
      reporter: 'tester'
    });
    expect(result.id).toBeTruthy();
    expect(resolvers.Query.issues()).toHaveLength(1);
  });
});
