SELECT 
  `organization_update`.`id`, "organization" as `source.type`, `organization`.`id` as `source.id`, `organization`.`name` as `source.name`, `organization_update`.`message`, `organization_update`.`mediaType`, `organization_update`.`mediaUrl`, `organization_update`.`projectId`, `organization_update`.`createdAt`, 
  `user`.`id` AS `user.id`, `user`.`firstName` AS `user.firstName`, `user`.`lastName` AS `user.lastName`, `user`.`image` AS `user.image`, `user`.`isProjectLeader` as `user.isProjectLeader`, `user`.`isCompanion` as `user.isCompanion`
FROM 
  `organization_updates` AS `organization_update`
LEFT JOIN `organizations` as `organization` ON `organization_update`.`organizationId` = `organization`.`id`
LEFT OUTER JOIN `view_users` AS `user` ON `organization_update`.`userId` = `user`.`id`
WHERE `organization_update`.`organizationId` = :organizationId
ORDER BY `organization_update`.`createdAt` DESC
LIMIT :limit
OFFSET :offset;