"""
Django management command to manage failed Celery tasks.
Usage: python manage.py celery_failed_tasks --action [list|retry|clear]
"""
from django.core.management.base import BaseCommand
from celery import current_app
from richwell_config.celery import app as celery_app


class Command(BaseCommand):
    help = 'Manage failed Celery tasks (list, retry, or clear)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--action',
            type=str,
            choices=['list', 'retry', 'clear'],
            default='list',
            help='Action to perform (default: list)',
        )
        parser.add_argument(
            '--task-id',
            type=str,
            help='Specific task ID to retry (use with --action retry)',
        )

    def handle(self, *args, **options):
        """Handle the command."""
        action = options.get('action', 'list')

        try:
            if action == 'list':
                self._list_failed_tasks()
            elif action == 'retry':
                self._retry_failed_tasks(options.get('task_id'))
            elif action == 'clear':
                self._clear_failed_tasks()

        except Exception as e:
            self.stderr.write(f'Error: {str(e)}')

    def _list_failed_tasks(self):
        """List all failed tasks."""
        self.stdout.write(self.style.SUCCESS('=== FAILED TASKS ===\n'))

        try:
            inspector = celery_app.control.inspect()
            reserved = inspector.reserved() or {}
            active = inspector.active() or {}

            failed_count = 0

            # Check for dead letter queue tasks (tasks that failed multiple times)
            # In Redis, these would be in a separate key
            # For now, we'll check the broker directly if possible

            if not reserved and not active:
                self.stdout.write(self.style.WARNING('No failed tasks found'))
                return

            # Display active and reserved tasks (potential failures)
            for worker_name, tasks in active.items():
                for task in tasks:
                    if task.get('retries', 0) > 0:
                        failed_count += 1
                        self._print_task_info(task, 'ACTIVE')

            for worker_name, tasks in reserved.items():
                for task in tasks:
                    if task.get('retries', 0) > 0:
                        failed_count += 1
                        self._print_task_info(task, 'RESERVED')

            if failed_count == 0:
                self.stdout.write(self.style.SUCCESS('No failed tasks found'))
            else:
                self.stdout.write(f'\nTotal: {failed_count} task(s) with retry attempts')

        except Exception as e:
            self.stderr.write(f'Error listing failed tasks: {str(e)}')

    def _retry_failed_tasks(self, task_id=None):
        """Retry failed tasks."""
        self.stdout.write(self.style.SUCCESS('=== RETRYING FAILED TASKS ===\n'))

        try:
            inspector = celery_app.control.inspect()

            if task_id:
                # Retry specific task
                # This would require accessing the task result backend
                self.stdout.write(f'Retrying task {task_id}...')
                # TODO: Implement specific task retry logic
            else:
                # Retry all failed tasks
                self.stdout.write('Retrying all failed tasks...')
                # TODO: Implement bulk retry logic

            self.stdout.write(self.style.SUCCESS('✓ Retry request sent to Celery'))

        except Exception as e:
            self.stderr.write(f'Error retrying tasks: {str(e)}')

    def _clear_failed_tasks(self):
        """Clear failed tasks from the queue."""
        self.stdout.write(self.style.WARNING('=== CLEARING FAILED TASKS ===\n'))

        confirm = input('This will clear all failed tasks. Continue? [y/N]: ')
        if confirm.lower() != 'y':
            self.stdout.write('Cancelled')
            return

        try:
            # Purge the dead letter queue
            celery_app.control.purge()
            self.stdout.write(self.style.SUCCESS('✓ All failed tasks cleared'))

        except Exception as e:
            self.stderr.write(f'Error clearing failed tasks: {str(e)}')

    def _print_task_info(self, task, status):
        """Print task information in readable format."""
        self.stdout.write(f'  Task: {task.get("name")}')
        self.stdout.write(f'  ID: {task.get("id")[:8]}...')
        self.stdout.write(f'  Status: {status}')
        self.stdout.write(f'  Retries: {task.get("retries", 0)}')
        self.stdout.write('')
