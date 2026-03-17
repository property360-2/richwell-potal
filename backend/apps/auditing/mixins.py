import json
from django.forms.models import model_to_dict
from .models import AuditLog

class AuditMixin:
    """
    Mixin to automatically log changes to a model.
    To be used with models that want to track CREATE/UPDATE/DELETE.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_state = self._get_instance_dict() if self.pk else {}

    def _get_instance_dict(self):
        return model_to_dict(self)

    def save(self, *args, **kwargs):
        user = kwargs.pop('audit_user', None)
        ip = kwargs.pop('audit_ip', None)
        
        try:
            is_new = self.pk is None
            super().save(*args, **kwargs)
            
            action = 'CREATE' if is_new else 'UPDATE'
            new_state = self._get_instance_dict()
            
            changes = {}
            if not is_new:
                for field, value in new_state.items():
                    old_value = self._original_state.get(field)
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
            
            # Update state after save
            self._original_state = new_state
        except Exception as e:
            # Fallback: create a minimal log or just fail gracefully if it's an audit issue
            # But here we want to see the error, so we'll log it to a file
            with open('audit_error.log', 'a') as f:
                import traceback
                f.write(f"Error in {self.__class__.__name__} save: {str(e)}\n")
                f.write(traceback.format_exc() + "\n")
            # We still want to let the main save succeed if possible? 
            # No, if super().save already ran, we are good.
            pass

    def delete(self, *args, **kwargs):
        user = kwargs.pop('audit_user', None)
        ip = kwargs.pop('audit_ip', None)
        
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
