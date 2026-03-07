from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seeds the database with initial users, academic data, terms, rooms, and students.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Seed data requires models from Phase 2+. This is a placeholder for Phase 1.'))
