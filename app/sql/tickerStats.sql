SELECT 
  (SELECT COUNT(id) 
    FROM users) 
  as users,

  (SELECT COUNT(id) 
    FROM projects 
    WHERE status != 'completed') 
  as projectsOpen,

  (SELECT COUNT(id) 
    FROM projects 
    WHERE status = 'completed') 
  as projectsCompleted,

  (SELECT IFNULL(SUM(donationAmount), 0) 
    FROM gives) 
  as totalDonations,

  (SELECT IFNULL(SUM(CEIL(give.donationAmount / p.project_cost * p.howmanybenefit)), 0) 
    FROM gives as give 
    LEFT JOIN projects as p on (give.projectId = p.id)) 
  as peopleHelped;