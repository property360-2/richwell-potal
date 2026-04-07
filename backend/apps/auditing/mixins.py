import json
from django.forms.models import model_to_dict
from .models import AuditLog
from .middleware import get_current_user, get_current_ip

class AuditMixin:
    """
    Mixin to automatically log changes to a model.
    To be used with models that want to track CREATE/UPDATE/DELETE.
    """
    def _get_instance_dict(self):
        return model_to_dict(self)

    def save(self, *args, **kwargs):
        user = kwargs.pop('audit_user', get_current_user())
        ip = kwargs.pop('audit_ip', get_current_ip())
        skip_audit = kwargs.pop('skip_audit', False)
        
        # Ensure user is a valid User model instance, not AnonymousUser LazyObject
        if user and hasattr(user, 'is_authenticated') and not user.is_authenticated:
            user = None

        if skip_audit:
            return super().save(*args, **kwargs)
        
        try:
            is_new = self.pk is None
            original_state = {}
            if not is_new:
                # Fetch only the fields we are tracking
                try:
                    original_instance = self.__class__.objects.get(pk=self.pk)
                    original_state = model_to_dict(original_instance)
                except self.__class__.DoesNotExist:
                    original_state = {}
            
            super().save(*args, **kwargs)
            
            action = 'CREATE' if is_new else 'UPDATE'
            new_state = self._get_instance_dict()
            
            changes = {}
            if not is_new:
                for field, value in new_state.items():
                    old_value = original_state.get(field)
                    if old_value != value:
                        # Serialize to JSON-friendly format
                        changes[field] = {
                            'old': str(old_value) if old_value is not None else None,
                            'new': str(value) if value is not None else None
                        }
            else:
                changes = {field: {'old': None, 'new': str(value)} for field, value in new_state.items()}

            if changes:
                AuditLog.objects.create(
                    user=user,
                    action=action,
                    model_name=self.__class__.__name__,
                    object_id=str(self.pk),
                    object_repr=str(self),
                    changes=changes,
                    ip_address=ip
                )
            
            # No need to update state, it's captured locally in save()
        except Exception as e:
            # Fallback: create a minimal log or just fail gracefully if it's an audit issue
            # But here we want to see the error, so we'll log it to a file
            with open('audit_error.log', 'a') as f:
                import traceback
                f.write(f"Error in {self.__class__.__name__} save: {str(e)}\n")
                f.write(traceback.format_exc() + "\n")
            # CRITICAL: We MUST re-raise the exception so the caller (like a seeder or view)
            # knows the save failed and doesn't proceed with incomplete data.
            raise e

    def delete(self, *args, **kwargs):
        user = kwargs.pop('audit_user', get_current_user())
        ip = kwargs.pop('audit_ip', get_current_ip())
        
        # Ensure user is a valid User model instance, not AnonymousUser LazyObject
        if user and hasattr(user, 'is_authenticated') and not user.is_authenticated:
            user = None

        pk = self.pk
        model_name = self.__class__.__name__
        repr_val = str(self)
        
        super().delete(*args, **kwargs)
        
        AuditLog.objects.create(
            user=user,
            action='DELETE',
            model_name=model_name,
            object_id=str(pk),
            object_repr=repr_val,
            changes={'deleted': True},
            ip_address=ip
        )
