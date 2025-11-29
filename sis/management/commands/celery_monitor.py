"""
Django management command to monitor Celery task queue status.
Usage: python manage.py celery_monitor
"""
from django.core.management.base import BaseCommand
from celery import current_app
from celery_app import app as celery_app
import json


class Command(BaseCommand):
    help = 'Monitor Celery task queue status and active tasks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--queue',
            type=str,
            help='Monitor specific queue (default: all)',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output as JSON',
        )

    def handle(self, *args, **options):
        """Handle the command."""
        try:
            inspector = celery_app.control.inspect()

            # Get active tasks
            active_tasks = inspector.active()
            registered_tasks = inspector.registered()
            stats = inspector.stats()

            output = {
                'active_tasks': active_tasks or {},
                'registered_tasks': registered_tasks or {},
                'worker_stats': stats or {},
            }

            if options.get('json'):
                self.stdout.write(json.dumps(output, indent=2, default=str))
            else:
                self._print_status(active_tasks, registered_tasks, stats)

        except Exception as e:
            self.stderr.write(f'Error connecting to Celery: {str(e)}')
            self.stdout.write('Make sure Redis is running and Celery workers are active.')

    def _print_status(self, active_tasks, registered_tasks, stats):
        """Print status in human-readable format."""
        self.stdout.write(self.style.SUCCESS('=== CELERY MONITOR ===\n'))

        # Worker stats
        if stats:
            self.stdout.write(self.style.SUCCESS('WORKERS:'))
            for worker_name, worker_stats in stats.items():
                self.stdout.write(f'  {worker_name}:')
                self.stdout.write(f'    Pool: {worker_stats.get("pool", {}).get("implementation", "N/A")}')
                self.stdout.write(f'    Concurrency: {worker_stats.get("pool", {}).get("max-concurrency", "N/A")}')
        else:
            self.stdout.write(self.style.WARNING('No workers currently connected'))

        self.stdout.write('\n')

        # Active tasks
        if active_tasks:
            self.stdout.write(self.style.SUCCESS('ACTIVE TASKS:'))
            for worker_name, tasks in active_tasks.items():
                self.stdout.write(f'  {worker_name}: {len(tasks)} task(s)')
                for task in tasks:
                    self.stdout.write(f'    - {task["name"]} (id: {task["id"][:8]}...)')
        else:
            self.stdout.write(self.style.WARNING('No active tasks'))

        self.stdout.write('\n')

        # Registered tasks
        if registered_tasks:
            self.stdout.write(self.style.SUCCESS('REGISTERED TASKS:'))
            for worker_name, tasks in registered_tasks.items():
                self.stdout.write(f'  {worker_name}: {len(tasks)} task(s)')
                for task_name in tasks[:5]:  # Show first 5
                    self.stdout.write(f'    - {task_name}')
                if len(tasks) > 5:
                    self.stdout.write(f'    ... and {len(tasks) - 5} more')
