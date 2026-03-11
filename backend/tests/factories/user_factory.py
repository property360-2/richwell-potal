import factory
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.Sequence(lambda n: f'user{n}@test.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = 'STUDENT'
    must_change_password = False

    @factory.lazy_attribute
    def password(self):
        return 'testpass123'

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop('password', None)
        if password is None:
            password = 'testpass123'
        user = model_class(*args, **kwargs)
        user.set_password(password)
        user.save(update_fields=None)
        return user


class AdminUserFactory(UserFactory):
    username = factory.Sequence(lambda n: f'admin{n}')
    email = factory.Sequence(lambda n: f'admin{n}@test.com')
    role = 'ADMIN'
    is_staff = True
    is_superuser = True


class RegistrarUserFactory(UserFactory):
    username = factory.Sequence(lambda n: f'registrar{n}')
    email = factory.Sequence(lambda n: f'registrar{n}@test.com')
    role = 'REGISTRAR'
    is_staff = True


class StudentUserFactory(UserFactory):
    username = factory.Sequence(lambda n: f'student{n}')
    email = factory.Sequence(lambda n: f'student{n}@test.com')
    role = 'STUDENT'


class ProfessorUserFactory(UserFactory):
    username = factory.Sequence(lambda n: f'professor{n}')
    email = factory.Sequence(lambda n: f'professor{n}@test.com')
    role = 'PROFESSOR'
    is_staff = True


class CashierUserFactory(UserFactory):
    username = factory.Sequence(lambda n: f'cashier{n}')
    email = factory.Sequence(lambda n: f'cashier{n}@test.com')
    role = 'CASHIER'
    is_staff = True


class DeanUserFactory(UserFactory):
    username = factory.Sequence(lambda n: f'dean{n}')
    email = factory.Sequence(lambda n: f'dean{n}@test.com')
    role = 'DEAN'
    is_staff = True


class AdmissionUserFactory(UserFactory):
    username = factory.Sequence(lambda n: f'admission{n}')
    email = factory.Sequence(lambda n: f'admission{n}@test.com')
    role = 'ADMISSION'
    is_staff = True


class ProgramHeadUserFactory(UserFactory):
    username = factory.Sequence(lambda n: f'programhead{n}')
    email = factory.Sequence(lambda n: f'programhead{n}@test.com')
    role = 'PROGRAM_HEAD'
    is_staff = True
