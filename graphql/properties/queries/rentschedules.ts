import { gql } from "@apollo/client";

export const RENT_SCHEDULES = gql`
query RentSchedules($first: Int, $after:String) {
  rentSchedules(first:$first, after:$after) {
    edges {
      node {
        id
        unit{
          unitNumber
          id
        }
        building{
          name
          id
        }
        periodEnd
        periodStart
        tenant{
          id
          fullName
        }
        rentAmount
        serviceCharge
        dueDate
        penalty
        expectedAmount
        paidAmount
        status
        notes
        balance
      }
    }
  }
}`;
