export function isOwner(email: unknown, verified: unknown, owner: unknown) {
 return typeof owner === 'string' && owner.trim().length > 0 && typeof email === 'string' && verified === true && email.trim().toLowerCase() === owner.trim().toLowerCase();
}
export function validSyncSecret(actual: string | null, expected: string | undefined) {
 if(!actual || !expected || expected.length < 32) return false;
 let diff=actual.length ^ expected.length;
 for(let i=0;i<expected.length;i++) diff|=(actual.charCodeAt(i)||0)^expected.charCodeAt(i);
 return diff===0;
}
