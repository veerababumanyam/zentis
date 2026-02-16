import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export const deleteAccount = async (): Promise<void> => {
    try {
        const deleteAccountFn = httpsCallable(functions, 'deleteAccount');
        const result = await deleteAccountFn();
        console.log('Account deletion result:', result.data);
    } catch (error) {
        console.error('Failed to delete account:', error);
        throw error;
    }
};
