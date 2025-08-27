import { EventEmitter } from 'events';
import { IEventEmitter } from '../interfaces/base';

/**
 * Event Emitter adapter that implements IEventEmitter interface
 */
export class EventEmitterAdapter extends EventEmitter implements IEventEmitter {
    emit(eventName: string | symbol, ...args: unknown[]): boolean {
        return super.emit(eventName, ...args);
    }

    on(eventName: string | symbol, listener: (...args: unknown[]) => void): this {
        return super.on(eventName, listener);
    }

    once(eventName: string | symbol, listener: (...args: unknown[]) => void): this {
        return super.once(eventName, listener);
    }

    removeListener(eventName: string | symbol, listener: (...args: unknown[]) => void): this {
        return super.removeListener(eventName, listener);
    }
}
