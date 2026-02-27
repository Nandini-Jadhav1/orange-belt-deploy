/**
 * Event Listening and State Synchronization
 * Handles real-time updates from the Stellar contract
 */

export interface VoteEvent {
  id: string;
  timestamp: number;
  voter: string;
  option: number;
  txHash?: string;
  status: "pending" | "confirmed";
}

export interface Event {
  type: "vote" | "wallet" | "contract" | "error";
  timestamp: number;
  message: string;
  data?: unknown;
}

let eventListeners: ((event: Event) => void)[] = [];
let voteEventListeners: ((event: VoteEvent) => void)[] = [];

/**
 * Subscribe to general events
 */
export function onEvent(callback: (event: Event) => void): () => void {
  eventListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    eventListeners = eventListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Subscribe to vote events specifically
 */
export function onVoteEvent(callback: (event: VoteEvent) => void): () => void {
  voteEventListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    voteEventListeners = voteEventListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Emit an event to all listeners
 */
export function emitEvent(event: Event): void {
  eventListeners.forEach((callback) => {
    try {
      callback(event);
    } catch (error) {
      console.error("Event listener error:", error);
    }
  });
}

/**
 * Emit a vote event to all listeners
 */
export function emitVoteEvent(event: VoteEvent): void {
  voteEventListeners.forEach((callback) => {
    try {
      callback(event);
    } catch (error) {
      console.error("Vote event listener error:", error);
    }
  });

  // Also emit as general event
  emitEvent({
    type: "vote",
    timestamp: event.timestamp,
    message: `Voter ${event.voter.slice(0, 8)}... voted for option ${event.option}`,
    data: event,
  });
}

/**
 * Listen to contract events via Soroban RPC (production implementation)
 * In demo mode, simulates random events
 */
export function subscribeToContractEvents(
  contractId: string,
  onVote: (voter: string, option: number) => void,
  interval: number = 6000
): () => void {
  const pollInterval = setInterval(async () => {
    try {
      // Simulate receiving events from contract
      // In production: Use Soroban RPC /contracts/{id}/events endpoint
      
      if (Math.random() > 0.65) {
        const voter = generateRandomAddress();
        const option = Math.floor(Math.random() * 3);
        
        const event: VoteEvent = {
          id: generateEventId(),
          timestamp: Date.now(),
          voter,
          option,
          status: "pending",
        };

        emitVoteEvent(event);
        onVote(voter, option);

        // Simulate confirmation
        setTimeout(() => {
          const confirmedEvent = { ...event, status: "confirmed" as const };
          emitVoteEvent(confirmedEvent);
        }, 1200);
      }
    } catch (error) {
      console.error("Event subscription error:", error);
      emitEvent({
        type: "error",
        timestamp: Date.now(),
        message: `Event polling failed: ${String(error)}`,
      });
    }
  }, interval);

  // Return unsubscribe function
  return () => clearInterval(pollInterval);
}

/**
 * Fetch events for a contract (useful for loading historical data)
 * In production: Query Soroban RPC or Horizon for VoteCast events
 */
export async function fetchContractEvents(
  contractId: string,
  limit: number = 50
): Promise<VoteEvent[]> {
  try {
    // Simulate fetching events
    const mockEvents: VoteEvent[] = [
      {
        id: generateEventId(),
        timestamp: Date.now() - 120000,
        voter: "GTML...HVF",
        option: 2,
        status: "confirmed",
      },
      {
        id: generateEventId(),
        timestamp: Date.now() - 90000,
        voter: "GHVY...5UE",
        option: 1,
        status: "confirmed",
      },
      {
        id: generateEventId(),
        timestamp: Date.now() - 60000,
        voter: "G2FC...RWB",
        option: 2,
        status: "confirmed",
      },
      {
        id: generateEventId(),
        timestamp: Date.now() - 30000,
        voter: "GA0E...SSI",
        option: 0,
        status: "confirmed",
      },
    ];

    return mockEvents.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch contract events:", error);
    return [];
  }
}

/**
 * Watch for transaction confirmations
 * Tracks transaction status from pending to confirmed
 */
export function watchTransaction(
  txHash: string,
  onConfirmed: (txHash: string) => void,
  onFailed: (txHash: string, error: string) => void,
  timeoutMs: number = 30000
): () => void {
  const startTime = Date.now();
  
  const pollInterval = setInterval(async () => {
    try {
      // In production: Query Horizon /transactions/{txHash}
      // Check for ledger_attr field to confirm inclusion
      
      const elapsed = Date.now() - startTime;
      
      // Simulate 90% success rate
      if (elapsed > 2000 && Math.random() > 0.1) {
        onConfirmed(txHash);
        clearInterval(pollInterval);
      }
      
      // Timeout after specified duration
      if (elapsed > timeoutMs) {
        onFailed(txHash, "Transaction confirmation timeout");
        clearInterval(pollInterval);
      }
    } catch (error) {
      console.error("Transaction watch error:", error);
    }
  }, 1000);

  // Return cancel function
  return () => clearInterval(pollInterval);
}

/**
 * Monitor wallet balance changes
 * In production: Use Horizon account event stream
 */
export function watchBalance(
  address: string,
  onChange: (newBalance: number) => void,
  interval: number = 10000
): () => void {
  const pollInterval = setInterval(async () => {
    try {
      // In production: Fetch from Horizon /accounts/{address}
      const newBalance = 10 + Math.random() * 200;
      onChange(newBalance);
    } catch (error) {
      console.error("Balance watch error:", error);
    }
  }, interval);

  return () => clearInterval(pollInterval);
}

/**
 * Get all active subscriptions for cleanup
 */
export function clearAllListeners(): void {
  eventListeners = [];
  voteEventListeners = [];
}

// ===== Helper Functions =====

function generateRandomAddress(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const address = "G" + Array.from({ length: 55 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return address.slice(0, 8) + "..." + address.slice(-5);
}

function generateEventId(): string {
  return Array.from({ length: 16 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
}
