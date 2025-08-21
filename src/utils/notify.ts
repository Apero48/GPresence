import { toast } from 'sonner';

export const notify = {
  success: (message: string, opts?: { description?: string }) =>
    toast.success(message, { description: opts?.description }),
  error: (message: string, opts?: { description?: string }) =>
    toast.error(message, { description: opts?.description }),
  info: (message: string, opts?: { description?: string }) =>
    toast(message, { description: opts?.description }),
  warning: (message: string, opts?: { description?: string }) =>
    toast.warning(message, { description: opts?.description }),
};

export default notify;
