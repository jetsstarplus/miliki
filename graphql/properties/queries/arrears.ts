import { gql } from "@apollo/client";

export const ARREARS_REPORT_QUERY = gql`
query ArrearsReport($first: Int, $after: String,){
  arrearsReport{
    summary{
      totalExpected
      totalPaid
      totalArrears
    }
    schedules(first:$first, after:$after){
      edges{
        node{
          id
          unit{
            unitNumber
            accountNumber
          }
          building{
            name
          }
          tenant{
            fullName
          }
          periodEnd
          periodStart
          dueDate
          rentAmount
          serviceCharge
          penalty
          expectedAmount
          paidAmount
          status
          notes
          daysOverdue
          balance
        }
      }
      pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
      }
    }
  }
}`;

