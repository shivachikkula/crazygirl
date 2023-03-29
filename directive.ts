import { OnInit, Input, Output, EventEmitter, Directive } from '@angular/core';
import { FormGroup, AbstractControl, ValidatorFn } from '@angular/forms';
import { IControlBuilder } from '../../shared/interfaces/i-control-builder';
import { forOwn } from 'lodash-es';
import { StringUtilsService } from '../services/utils/string-utils.service';
import { IConstants } from '../../shared/interfaces/i-constants';
import { IMatErrorInfo } from '../../shared/interfaces/i-mat-error-info';

@Directive()
export abstract class BaseDirective implements OnInit {
    constructor(protected _consts: IConstants, protected _string: StringUtilsService) {
    }

    @Input()
    serverErrors: any;
    @Output()
    serverErrorsChange: EventEmitter<any> = new EventEmitter<any>();
    public fg: FormGroup;

    get isFormValid(): boolean {
        return this.fg && this.fg.status !== 'INVALID';
    }

    protected buildControl(ctrlVal: number | string | string[] | Date | number[], ctrlBuilder: IControlBuilder, data?: any): any {
        let validators: any[] = [];

        if (ctrlBuilder.validators != null && ctrlBuilder.validators(data) != null) {
            const resolvedValidators = ctrlBuilder.validators(data);

            if (resolvedValidators != null) {
                validators = resolvedValidators;
            }
        }

        const fc = [{ value: ctrlVal, disabled: !ctrlBuilder.isEnabled(data) }, validators];
        return fc;
    }

    protected updateControl(ctrl: AbstractControl, ctrlBuilder: IControlBuilder, data?: any, disabledCtrlVal: number | string | Date | number[] = null): any {
        ctrl.clearValidators();
        if (ctrlBuilder.isEnabled(data)) {
            let newValidators: ValidatorFn[] = [];
            if (ctrlBuilder.validators) {
                newValidators = ctrlBuilder.validators(data);
            }
            if (newValidators.length > 0) {
                ctrl.setValidators(newValidators);
            }
            ctrl.enable();
        } else {
            if (ctrlBuilder.disabledValue) {
                disabledCtrlVal = ctrlBuilder.disabledValue(data);
            }

            ctrl.setValue(disabledCtrlVal, { emitEvent: false });
            ctrl.disable();
        }
    }

    protected updateControlAndValue(ctrl: AbstractControl, ctrlBuilder: IControlBuilder, data?: any, disabledCtrlVal: number | string | Date | number[] = null): any {
        this.updateControl(ctrl, ctrlBuilder, data, disabledCtrlVal);

        if (!ctrl.disabled && ctrlBuilder.value) {
            ctrl.setValue(ctrlBuilder.value(data), { emitEvent: false });
        }
    }

    protected updateControlValidators(ctrl: AbstractControl, ctrlBuilder: IControlBuilder, data?: any): void {
        ctrl.clearValidators();
        const newValidators = ctrlBuilder.validators(data);
        if (newValidators.length > 0) {
            ctrl.setValidators(newValidators);
            ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        }
    }

    ctrlHasError(ctrlName: string, customMessages?: any): IMatErrorInfo {        
        const ctrl = this.fg.controls[ctrlName];
        let matErrorInfo: IMatErrorInfo = null;

        if (ctrl) {
            if (this.fg.controls[ctrlName].hasError) {
                let errMsgs: string[] = [];
                forOwn(this.fg.controls[ctrlName].errors, (value, key) => {
                    if (key === 'serverErrors') {
                        errMsgs = errMsgs.concat(value);                       
                    } else {
                        if (key === 'pattern') {
                            forOwn(this._consts.REGULAR_EXPRESSIONS, (v, k) => {
                                if (value.requiredPattern === v) {
                                    key = `pattern_${k}`;
                                }
                            });
                        }
                        const msgKey = ((customMessages && customMessages[key]) ? customMessages[key] : key);
                        errMsgs.push(this._string.format((this._consts.MESSAGES as any)[msgKey], [(this._consts.DISPLAY_NAMES as any)[ctrlName]]));
                    }
                });

                matErrorInfo = {
                    name: ctrlName,
                    control: ctrl,
                    messages: errMsgs
                };
            }
        }

        return matErrorInfo;
    }

    ngOnInit(): void { }
}
