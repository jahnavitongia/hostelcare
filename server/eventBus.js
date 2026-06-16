const EventEmitter = require('events');

const eventBus = new EventEmitter();
const notificationLog = [];

function issueCreatedListener(issue) {
  const message = `Notification: New issue created by ${issue.reporter}: ${issue.title}`;
  notificationLog.push({ type: 'issueCreated', issueId: issue.id, message });
  console.log(message);
}

function issueUpdatedListener(issue) {
  const message = `Notification: Issue ${issue.id} moved to ${issue.status}`;
  notificationLog.push({ type: 'issueUpdated', issueId: issue.id, message });
  console.log(message);
}

eventBus.on('issueCreated', issueCreatedListener);
eventBus.on('issueUpdated', issueUpdatedListener);

eventBus.getNotificationLog = () => notificationLog;
eventBus.clearNotificationLog = () => {
  notificationLog.length = 0;
};

module.exports = eventBus;
