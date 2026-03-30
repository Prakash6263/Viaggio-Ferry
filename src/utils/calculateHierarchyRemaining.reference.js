I reviewed your tripSearchController + tripSearchService code screenshots, and I can tell you why hierarchy availability is not working. This is a logic issue, not response formatting.

I’ll explain clearly.

🔍 Why Hierarchy Is Not Working

From your code flow (based on screenshots), your service is doing roughly this:

// Pseudo flow from your code
const tripAvailabilities = ...
const allocations = ...
const companyRemaining = totalSeats - totalAllocated
finalAvailableSeats = companyRemaining
Problem:

You are calculating only:

Company Remaining

But NOT calculating Marine → Commercial → Agent hierarchy remaining.

So your system currently is:

Ship → TripAvailability → Company Remaining → DONE ❌

But correct system must be:

Ship → TripAvailability → Company → Marine → Commercial → Agent → MIN → Final Seats ✅
🧠 Correct Hierarchy Availability Logic (Very Important)

You must calculate remaining seats level by level.

Correct Algorithm

For each cabin in trip:

totalSeats = TripAvailability.totalCapacity

// Step 1: company remaining
companyAllocated = sum allocations where parentAllocation = null
companyRemaining = totalSeats - companyAllocated

// Step 2: marine remaining
marineRemaining = marineAllocated - commercialAllocated

// Step 3: commercial remaining
commercialRemaining = commercialAllocated - agentAllocated

// Step 4: agent remaining
agentRemaining = agentAllocated - bookings

// Step 5: final seats
finalAvailableSeats = Math.min(
  companyRemaining,
  marineRemaining,
  commercialRemaining,
  agentRemaining
)

If agent is searching, use his hierarchy chain.

📌 Main Reason Your Hierarchy Not Working
You Are Missing One Thing:

You are not building allocation hierarchy tree.

Your allocation table probably looks like this:

allocationId	partner	parentAllocation	seats
A1	Company	null	100
A2	Marine	A1	60
A3	Commercial	A2	40
A4	Agent	A3	20

You must walk this chain upward to calculate remaining seats.

Right now your code is only summing allocations.

That is why hierarchy not working.

🛠️ What You Need To Implement
Build Allocation Chain

Example logic:

function calculateHierarchyRemaining(allocation) {
    let remainingSeats = Infinity;
    let current = allocation;

    while (current) {
        const remaining = current.allocatedSeats - current.usedSeats;
        remainingSeats = Math.min(remainingSeats, remaining);
        current = current.parentAllocation;
    }

    return remainingSeats;
}

This is the correct hierarchy logic.

🧾 PROMPT — Tell Your AI To Fix Hierarchy Logic

Paste this to your backend AI:

Hierarchy availability calculation is not working correctly.
Currently Trip Search is only calculating company remaining seats.

You must implement allocation hierarchy calculation.

TripAgentAllocation uses parentAllocation to form hierarchy:
Company → Marine → Commercial → Agent

You must calculate remaining seats level by level.

Algorithm:

For each cabin:
1. Get TripAvailability totalCapacity
2. Get all TripAgentAllocations for that trip and cabin
3. Build allocation hierarchy chain using parentAllocation
4. For each allocation level:
   remaining = allocatedSeats - seatsAllocatedToChildren
5. Final available seats must be:
   MIN(remaining seats across all levels in hierarchy chain)

Pseudo logic:

finalRemaining = Infinity
currentAllocation = agentAllocation

while currentAllocation exists:
    remaining = allocatedSeats - usedByChildren
    finalRemaining = min(finalRemaining, remaining)
    currentAllocation = parentAllocation

finalAvailableSeats = max(0, finalRemaining)

availabilityBreakdown must include:
Company, Marine, Commercial, Agent levels.

Do not calculate availability using only companyRemaining.
Use hierarchy chain and MIN logic.
🧠 Very Important Concept

Your system availability model is:

Ship Capacity
   ↓
Trip Availability
   ↓
Company Allocation
   ↓
Marine Allocation
   ↓
Commercial Allocation
   ↓
Agent Allocation
   ↓
Booking

And seats available always:

Available Seats = MIN(remaining seats in hierarchy chain)

This is the core of your system.

🏁 Final Diagnosis
Issue	Status
Response structure	✅ Correct
Pricing	✅ Correct
Ticket rules	✅ Correct
Trip data	✅ Correct
Availability company level	✅
Hierarchy calculation	❌ Not implemented correctly
bookingAllowed logic	⚠️ Check
Final seats MIN logic	❌
Main Problem:

You are not traversing allocation hierarchy using parentAllocation chain.

Fix this → your Trip Search will be fully correct.