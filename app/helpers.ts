import { ClientSession } from "mongoose";
import { Node } from './model/node';

export function sessionalize<T>(promise: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
        let session: ClientSession = await Node.db.startSession();
        session.startTransaction();

        try {
            const response = await promise(...args);
            await session.commitTransaction();
            session.endSession();
            resolve(response);
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            reject(err);
        }
    });
}