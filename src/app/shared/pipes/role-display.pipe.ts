import { Pipe, PipeTransform } from '@angular/core';
import { userTypes } from '../../data/user-types';

@Pipe({
    name: 'roleDisplay',
    standalone: false
})
export class RoleDisplayPipe implements PipeTransform {

  transform(value: string): string {
    const userType = userTypes.find(t => t.value === value);
    return userType ? userType.display : value;
  }

}
