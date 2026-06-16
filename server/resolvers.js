const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const eventBus = require('./eventBus');
const { roleForUsername, signToken } = require('./auth');

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const statusCycle = ['OPEN', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'RESOLVED', 'OPEN', 'IN_PROGRESS'];
const reporters = ['ria', 'kabir', 'neha', 'arjun', 'maya', 'sana', 'dev', 'tara'];
const rooms = ['room 101', 'room 104', 'room 112', 'room 203', 'room 207', 'room 212', 'room 301', 'room 307', 'room 314', 'room 402', 'room 408', 'room 412'];
const locations = ['north wing', 'south wing', 'east corridor', 'west staircase', 'common room', 'laundry block', 'hostel entrance', 'terrace level'];
const issueBlueprints = [
  {
    title: 'Leaky faucet',
    description: 'Tap keeps dripping and leaving the sink area wet.'
  },
  {
    title: 'Corridor light outage',
    description: 'The hallway is dim after sunset and needs a bulb replacement.'
  },
  {
    title: 'Broken chair',
    description: 'A study chair has a loose leg and feels unsafe to use.'
  },
  {
    title: 'Slow Wi-Fi signal',
    description: 'Network drops on upper floors during evening hours.'
  },
  {
    title: 'Blocked drain',
    description: 'Water pools near the bathroom drain after every shower.'
  },
  {
    title: 'AC not cooling',
    description: 'The room AC is running but barely cooling the space.'
  },
  {
    title: 'Desk lamp failure',
    description: 'The reading lamp flickers and shuts off intermittently.'
  },
  {
    title: 'Broken window latch',
    description: 'The window does not lock properly and rattles at night.'
  },
  {
    title: 'Water dispenser issue',
    description: 'The dispenser is leaking around the nozzle area.'
  },
  {
    title: 'Bathroom odor complaint',
    description: 'A stale smell is lingering after cleaning rounds.'
  }
];

function createRandom(seed) {
  let state = seed;

  return function next() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function buildSeedIssues() {
  const random = createRandom(4206);
  const issues = [];
  const baseTime = new Date('2026-05-18T08:00:00.000Z').getTime();

  for (let index = 0; index < 96; index += 1) {
    const blueprint = pick(random, issueBlueprints);
    const room = pick(random, rooms);
    const location = pick(random, locations);
    const status = statusCycle[index % statusCycle.length];
    const createdAt = new Date(baseTime + index * 13 * 60 * 60 * 1000 + Math.floor(random() * 6 * 60 * 60 * 1000)).toISOString();
    const updatedAt = new Date(new Date(createdAt).getTime() + Math.floor(random() * 4 * 24 * 60 * 60 * 1000)).toISOString();

    issues.push({
      id: `issue-${index + 1}`,
      title: `${blueprint.title} in ${room}`,
      description: `${blueprint.description} Reported near the ${location}.`,
      status,
      reporter: pick(random, reporters),
      createdAt,
      updatedAt: status === 'OPEN' ? createdAt : updatedAt
    });
  }

  return issues;
}

const issues = buildSeedIssues();

function assertAuthenticated(context) {
  if (!context.user) {
    throw new AuthenticationError('You must be logged in.');
  }
}

function assertAdmin(context) {
  assertAuthenticated(context);
  if (context.role !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can perform this action.');
  }
}

function makeIssue({ title, description, reporter }) {
  const now = new Date().toISOString();

  return {
    id: `issue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    description,
    status: 'OPEN',
    reporter,
    createdAt: now,
    updatedAt: now
  };
}

const resolvers = {
  Query: {
    me: (_, __, context) => context.user || null,
    issues: () => issues,
    issue: (_, { id }) => issues.find((issue) => issue.id === id) || null
  },
  Mutation: {
    login: (_, { username, password }) => {
      if (!username.trim() || !password.trim()) {
        throw new UserInputError('Username and password are required.');
      }

      return {
        token: signToken(username.trim()),
        username: username.trim(),
        role: roleForUsername(username.trim())
      };
    },
    createIssue: (_, { title, description }, context) => {
      assertAuthenticated(context);

      if (!title.trim() || !description.trim()) {
        throw new UserInputError('Title and description are required.');
      }

      const newIssue = makeIssue({
        title: title.trim(),
        description: description.trim(),
        reporter: context.user
      });

      issues.unshift(newIssue);
      eventBus.emit('issueCreated', newIssue);
      return newIssue;
    },
    updateIssue: (_, { id, status }, context) => {
      assertAdmin(context);

      if (!VALID_STATUSES.includes(status)) {
        throw new UserInputError(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      const issue = issues.find((item) => item.id === id);
      if (!issue) {
        return null;
      }

      issue.status = status;
      issue.updatedAt = new Date().toISOString();
      eventBus.emit('issueUpdated', issue);
      return issue;
    },
    deleteIssue: (_, { id }, context) => {
      assertAdmin(context);

      const index = issues.findIndex((issue) => issue.id === id);
      if (index === -1) {
        return false;
      }

      issues.splice(index, 1);
      return true;
    }
  }
};

Object.defineProperty(resolvers, '__store', {
  value: {
    issues,
    resetIssues() {
      issues.splice(0, issues.length);
    },
    seedIssues(seed) {
      issues.splice(0, issues.length, ...seed);
    }
  }
});

module.exports = resolvers;
